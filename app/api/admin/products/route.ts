import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { products } from "../../../../db/schema";
import { categoryExists, cleanText, ensureSeedData, makeId, requireAdminResponse } from "../../../../lib/cms";
import { productInput, apiError, readPayload } from "../../../../lib/admin-validation";
import { imageJson } from "../../../../lib/product-images";

async function save(request: Request, editing: boolean) {
  const denied = await requireAdminResponse(request);
  if (denied) return denied;
  try {
    await ensureSeedData();
    const payload = await readPayload(request);
    const parsed = productInput.parse(payload);
    const { images, ...fields } = parsed;
    const data = { ...fields, image: images[0], imagesJson: imageJson(images, parsed.image) };
    const id = editing ? cleanText(payload.id, 100) : makeId("prd");
    if (!await categoryExists(data.categoryId)) return Response.json({ error: "Danh mục không tồn tại." }, { status: 400 });
    const now = new Date().toISOString();
    if (editing) {
      const changed = await getDb().update(products).set({ ...data, updatedAt: now }).where(eq(products.id, id)).returning({ id: products.id });
      if (!changed.length) return Response.json({ error: "Sản phẩm đã bị xóa." }, { status: 404 });
    } else await getDb().insert(products).values({ id, ...data, createdAt: now, updatedAt: now });
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
    if (!id) return Response.json({ error: "Thiếu mã sản phẩm." }, { status: 400 });
    const changed = await getDb().delete(products).where(eq(products.id, id)).returning({ id: products.id });
    if (!changed.length) return Response.json({ error: "Sản phẩm đã bị xóa." }, { status: 404 });
    return Response.json({ ok: true });
  } catch (error) { return apiError(error); }
}

