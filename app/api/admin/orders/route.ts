import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { orders } from "../../../../db/schema";
import { cleanText, makeId, requireAdminResponse } from "../../../../lib/cms";
import { orderInput, orderStatuses, apiError, readPayload } from "../../../../lib/admin-validation";

async function save(request: Request, editing: boolean) {
  const denied = await requireAdminResponse(request);
  if (denied) return denied;
  try {
    const payload = await readPayload(request);
    const id = editing ? cleanText(payload.id, 100) : `LFH-${new Date().getFullYear()}-${makeId("ORD").slice(-8).toUpperCase()}`;
    if (editing && Object.keys(payload).every((key) => ["id", "status"].includes(key))) {
      const status = typeof payload.status === "string" ? payload.status : "";
      if (!orderStatuses.some(s => s === status)) return Response.json({ error: "Trạng thái không hợp lệ." }, { status: 400 });
      const changed = await getDb().update(orders).set({ status }).where(eq(orders.id, id)).returning({ id: orders.id });
      if (!changed.length) return Response.json({ error: "Đơn hàng đã bị xóa." }, { status: 404 });
    } else {
      const { items, ...fields } = orderInput.parse(payload);
      const lines = items.map((item) => ({ ...item, subtotal: item.price * item.quantity }));
      const total = lines.reduce((sum, item) => sum + item.subtotal, 0);
      if (!Number.isSafeInteger(total) || total > 1_000_000_000) return Response.json({ error: "Tổng tiền đơn hàng quá lớn." }, { status: 400 });
      const data = { ...fields, itemsJson: JSON.stringify(lines), total };
      if (editing) {
        const changed = await getDb().update(orders).set(data).where(eq(orders.id, id)).returning({ id: orders.id });
        if (!changed.length) return Response.json({ error: "Đơn hàng đã bị xóa." }, { status: 404 });
      } else await getDb().insert(orders).values({ id, ...data, createdAt: new Date().toISOString() });
    }
    return Response.json({ id }, { status: editing ? 200 : 201 });
  } catch (error) { return apiError(error); }
}
export const POST = (request: Request) => save(request, false);
export const PATCH = (request: Request) => save(request, true);
export async function DELETE(request: Request) {
  const denied = await requireAdminResponse(request);
  if (denied) return denied;
  try {
    const id = cleanText(new URL(request.url).searchParams.get("id"), 100);
    if (!id) return Response.json({ error: "Thiếu mã đơn hàng." }, { status: 400 });
    const changed = await getDb().delete(orders).where(eq(orders.id, id)).returning({ id: orders.id });
    if (!changed.length) return Response.json({ error: "Đơn hàng đã bị xóa." }, { status: 404 });
    return Response.json({ ok: true });
  } catch (error) { return apiError(error); }
}

