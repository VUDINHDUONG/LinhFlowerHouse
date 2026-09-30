import { env } from "cloudflare:workers";

function adminPassword() {
  return import.meta.env.DEV ? env.ADMIN_LOCAL_TOKEN : env.ADMIN_PASSWORD;
}

export async function POST(request: Request) {
  const password = adminPassword();
  if (!password) return new Response(null, { status: 404 });
  const origin = request.headers.get("origin");
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get("sec-fetch-site") === "cross-site") return new Response(null, { status: 403 });
  try {
    const { token } = await request.json() as { token?: unknown };
    if (typeof token !== "string" || token !== password) return Response.json({ error: "Mã truy cập chưa đúng." }, { status: 401 });
    return Response.json({ ok: true }, { headers: {
      "Cache-Control": "no-store",
      "Set-Cookie": `linh_local_admin=${password}; Path=/; HttpOnly; SameSite=Strict; Max-Age=43200${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`,
    } });
  } catch { return Response.json({ error: "Yêu cầu không hợp lệ." }, { status: 400 }); }
}
