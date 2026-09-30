import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { categories, products } from "../../../../db/schema";
import { cleanText, ensureSeedData, makeId, requireAdminResponse } from "../../../../lib/cms";
import { categoryInput, apiError, readPayload } from "../../../../lib/admin-validation";

async function save(request: Request, editing: boolean) {
  const denied = await requireAdminResponse(request);
  if (denied) return denied;
  try {
    await ensureSeedData();
    const payload = await readPayload(request);
    const data = categoryInput.parse(payload);
    const id = editing ? cleanText(payload.id, 100) : makeId("cat");
    const duplicate = await getDb().select().from(categories).where(eq(categories.slug, data.slug)).limit(1);
    if (duplicate.length && duplicate[0].id !== id) return Response.json({ error: "Đường dẫn danh mục đã được sử dụng." }, { status: 409 });
    if (editing) {
      const changed = await getDb().update(categories).set(data).where(eq(categories.id, id)).returning({ id: categories.id });
      if (!changed.length) return Response.json({ error: "Danh mục đã bị xóa." }, { status: 404 });
    } else await getDb().insert(categories).values({ id, ...data });
    return Response.json({ id }, { status: editing ? 200 : 201 });
  } catch (error) { return apiError(error); }
}
export const POST = (request: Request) => save(request, false);
export const PATCH = (request: Request) => save(request, true);
export async function DELETE(request: Request) {
  const denied = await requireAdminResponse(request);
  if (denied) return denied;
  try {
    await ensureSeedData();
    const id = cleanText(new URL(request.url).searchParams.get("id"), 100);
    if (!id) return Response.json({ error: "Thiếu mã danh mục." }, { status: 400 });
    const affected = await getDb().select({ id: products.id }).from(products).where(eq(products.categoryId, id)).limit(1);
    if (affected.length) return Response.json({ error: "Hãy chuyển các sản phẩm sang danh mục khác trước khi xóa." }, { status: 409 });
    const changed = await getDb().delete(categories).where(eq(categories.id, id)).returning({ id: categories.id });
    if (!changed.length) return Response.json({ error: "Danh mục đã bị xóa." }, { status: 404 });
    return Response.json({ ok: true });
  } catch (error) { return apiError(error); }
}

