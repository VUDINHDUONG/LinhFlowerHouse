import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "../../../../db";
import { adminUsers } from "../../../../db/schema";
import { adminSessionUsername, createAdminPasswordHash, verifyAdminPassword } from "../../../../lib/admin-auth";
import { requireAdminResponse } from "../../../../lib/cms";

function signingKey() {
  return import.meta.env.DEV ? env.ADMIN_LOCAL_TOKEN : env.ADMIN_PASSWORD;
}

export async function POST(request: Request) {
  const unauthorized = await requireAdminResponse(request);
  if (unauthorized) return unauthorized;
  if (import.meta.env.DEV) return Response.json({ error: "Chỉ đổi mật khẩu trên bản live." }, { status: 400 });
  const username = await adminSessionUsername((await cookies()).get("linh_local_admin")?.value, signingKey());
  if (!username) return Response.json({ error: "Phiên đăng nhập không hợp lệ. Hãy đăng nhập lại." }, { status: 403 });
  try {
    const body = await request.json() as { currentPassword?: unknown; newPassword?: unknown };
    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
    if (!currentPassword || newPassword.length < 10 || newPassword.length > 128 || !/[a-zA-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
      return Response.json({ error: "Mật khẩu mới cần từ 10 ký tự, gồm ít nhất một chữ cái và một số." }, { status: 400 });
    }
    if (currentPassword === newPassword) return Response.json({ error: "Mật khẩu mới cần khác mật khẩu hiện tại." }, { status: 400 });
    const db = getDb();
    const user = await db.select().from(adminUsers).where(eq(adminUsers.username, username)).limit(1);
    if (!user[0]?.active || !(await verifyAdminPassword(currentPassword, user[0].passwordHash))) {
      return Response.json({ error: "Mật khẩu hiện tại không đúng." }, { status: 401 });
    }
    await db.update(adminUsers).set({ passwordHash: await createAdminPasswordHash(newPassword), updatedAt: new Date().toISOString() }).where(eq(adminUsers.id, user[0].id));
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Không thể đổi mật khẩu. Hãy thử lại." }, { status: 400 });
  }
}
