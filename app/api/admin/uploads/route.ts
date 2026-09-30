import { env } from "cloudflare:workers";
import { requireAdminResponse } from "../../../../lib/cms";

const MAX_FILE = 8 * 1024 * 1024;
const decoder = new TextDecoder();
const cloudinaryFolder = "linh-flower-house/products";

function bytesEqual(data: Uint8Array, expected: number[], start = 0) {
  return expected.every((value, index) => data[start + index] === value);
}

function isHeif(data: Uint8Array) {
  if (decoder.decode(data.slice(4, 8)) !== "ftyp") return false;
  return ["heic", "heix", "hevc", "hevx", "mif1", "msf1"].includes(decoder.decode(data.slice(8, 12)));
}

function hex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function cloudinarySignature(value: string) {
  return hex(await crypto.subtle.digest("SHA-1", new TextEncoder().encode(value)));
}

async function uploadToCloudinary(data: Uint8Array, type: string, ext: string, originalName: string) {
  const cloudName = env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !apiKey || !apiSecret) return null;

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = await cloudinarySignature(`folder=${cloudinaryFolder}&timestamp=${timestamp}${apiSecret}`);
  const form = new FormData();
  // Copy into a plain ArrayBuffer: Workers' Uint8Array type may also permit
  // SharedArrayBuffer, which Blob intentionally does not accept.
  const fileBuffer = data.slice().buffer as ArrayBuffer;
  form.append("file", new Blob([fileBuffer], { type }), originalName || `product.${ext}`);
  form.append("api_key", apiKey);
  form.append("timestamp", timestamp);
  form.append("folder", cloudinaryFolder);
  form.append("signature", signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`, {
    method: "POST",
    body: form,
  });
  const result = await response.json().catch(() => ({})) as { secure_url?: string; bytes?: number; error?: { message?: string } };
  const expectedOrigin = `https://res.cloudinary.com/${cloudName}/`;
  if (!response.ok || !result.secure_url?.startsWith(expectedOrigin)) {
    throw new Error(result.error?.message || "Cloudinary không thể lưu ảnh.");
  }
  return { url: result.secure_url, size: result.bytes ?? data.byteLength };
}

export async function POST(request: Request) {
  const denied = await requireAdminResponse(request);
  if (denied) return denied;
  if (!env.BUCKET && !env.CLOUDINARY_CLOUD_NAME) return Response.json({ error: "Kho ảnh chưa sẵn sàng." }, { status: 503 });
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data")) return Response.json({ error: "Hãy chọn một ảnh để tải lên." }, { status: 400 });

  try {
    // Bound the body even when Content-Length is missing or inaccurate.
    const reader = request.body?.getReader();
    if (!reader) return Response.json({ error: "Không có tệp ảnh." }, { status: 400 });
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > MAX_FILE + 65536) {
        await reader.cancel();
        return Response.json({ error: "Ảnh tối đa 8 MB. Hãy chọn ảnh nhỏ hơn." }, { status: 413 });
      }
      chunks.push(part.value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const form = await new Response(bytes, { headers: { "Content-Type": contentType } }).formData();
    const file = form.get("file");
    if (!file || typeof file === "string" || !file.size) return Response.json({ error: "Tệp ảnh trống hoặc không hợp lệ." }, { status: 400 });
    if (file.size > MAX_FILE) return Response.json({ error: "Ảnh tối đa 8 MB." }, { status: 413 });

    const data = new Uint8Array(await file.arrayBuffer());
    let type = "", ext = "";
    if (bytesEqual(data, [0xff, 0xd8, 0xff])) { type = "image/jpeg"; ext = "jpg"; }
    else if (bytesEqual(data, [137, 80, 78, 71, 13, 10, 26, 10])) { type = "image/png"; ext = "png"; }
    else if (decoder.decode(data.slice(0, 4)) === "RIFF" && decoder.decode(data.slice(8, 12)) === "WEBP") { type = "image/webp"; ext = "webp"; }
    else if (isHeif(data)) { type = "image/heic"; ext = "heic"; }
    const compatibleTypes = type === "image/heic" ? ["", "image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence"] : ["", type];
    const reportedType = file.type.toLowerCase().split(";", 1)[0].trim();
    if (!type || !compatibleTypes.includes(reportedType)) return Response.json({ error: "Chỉ nhận ảnh JPG, PNG, WebP hoặc HEIC hợp lệ." }, { status: 415 });

    const cloudinary = await uploadToCloudinary(data, type, ext, file.name);
    if (cloudinary) return Response.json(cloudinary, { status: 201 });

    if (!env.BUCKET) return Response.json({ error: "Cloudinary chưa được cấu hình đầy đủ." }, { status: 503 });
    const key = `${crypto.randomUUID()}.${ext}`;
    await env.BUCKET.put(`products/${key}`, data, { httpMetadata: { contentType: type, cacheControl: "public, max-age=31536000, immutable" } });
    return Response.json({ url: `/api/media/${key}`, size: file.size }, { status: 201 });
  } catch (error) {
    console.error("Image upload failed", error);
    return Response.json({ error: "Không thể tải ảnh. Kiểm tra kết nối và thử lại." }, { status: 400 });
  }
}
