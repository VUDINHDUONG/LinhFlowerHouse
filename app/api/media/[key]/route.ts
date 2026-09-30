import { env } from "cloudflare:workers";

export async function GET(_request: Request, context: { params: Promise<{ key: string }> }) {
  const { key } = await context.params;
  if (!/^[a-f0-9-]{36}\.(jpg|png|webp|heic)$/.test(key) || !env.BUCKET) return new Response("Không tìm thấy ảnh", { status: 404 });
  const file = await env.BUCKET.get(`products/${key}`);
  if (!file) return new Response("Không tìm thấy ảnh", { status: 404 });
  return new Response(file.body, { headers: {
    "Content-Type": file.httpMetadata?.contentType ?? "application/octet-stream",
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff", "ETag": file.httpEtag,
  } });
}
