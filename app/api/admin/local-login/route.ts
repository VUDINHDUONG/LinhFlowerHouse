import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { createAdminSession, verifyAdminPassword } from "../../../../lib/admin-auth";
import { getDb } from "../../../../db";
import { adminUsers } from "../../../../db/schema";

function adminPassword() {
  return import.meta.env.DEV ? env.ADMIN_LOCAL_TOKEN : env.ADMIN_PASSWORD;
}

export async function POST(request: Request) {
  const password = adminPassword();
  if (!password) return new Response(null, { status: 404 });
  const origin = request.headers.get("origin");
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get("sec-fetch-site") === "cross-site") return new Response(null, { status: 403 });
  try {
    const body = await request.json() as { token?: unknown; username?: unknown; password?: unknown };
    let session: string | undefined;
    if (import.meta.env.DEV) {
      if (typeof body.token !== "string" || body.token !== password) return Response.json({ error: "Mã truy cập chưa đúng." }, { status: 401 });
      session = password;
    } else {
      const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
      const userPassword = typeof body.password === "string" ? body.password : "";
      if (!/^[a-z0-9_-]{3,64}$/.test(username) || !userPassword || userPassword.length > 128) return Response.json({ error: "Tên đăng nhập hoặc mật khẩu chưa đúng." }, { status: 401 });
      const user = await getDb().select().from(adminUsers).where(eq(adminUsers.username, username)).limit(1);
      if (!user[0]?.active || !(await verifyAdminPassword(userPassword, user[0].passwordHash))) return Response.json({ error: "Tên đăng nhập hoặc mật khẩu chưa đúng." }, { status: 401 });
      session = await createAdminSession(username, password);
    }
    return Response.json({ ok: true }, { headers: {
      "Cache-Control": "no-store",
      "Set-Cookie": `linh_local_admin=${session}; Path=/; HttpOnly; SameSite=Strict; Max-Age=43200${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`,
    } });
  } catch { return Response.json({ error: "Yêu cầu không hợp lệ." }, { status: 400 }); }
}
