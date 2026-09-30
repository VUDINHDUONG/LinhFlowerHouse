import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../db";
import { products, orders } from "../../../db/schema";
import { cleanText, ensureSeedData, makeId } from "../../../lib/cms";

type RequestedItem = { productId?: string; quantity?: number };

export async function POST(request: Request) {
  try {
    await ensureSeedData();
    const payload = (await request.json()) as Record<string, unknown>;
    const customerName = cleanText(payload.customerName, 80);
    const phone = cleanText(payload.phone, 30);
    const recipientName = cleanText(payload.recipientName, 80);
    const address = cleanText(payload.address, 300);
    const deliveryDate = cleanText(payload.deliveryDate, 20);
    const deliverySlot = cleanText(payload.deliverySlot, 80);
    const email = cleanText(payload.email, 120);
    const cardMessage = cleanText(payload.cardMessage, 400);
    const note = cleanText(payload.note, 400);
    const requested = Array.isArray(payload.items) ? (payload.items as RequestedItem[]) : [];

    if (!customerName || !phone || !recipientName || !address || !deliveryDate || !deliverySlot || !requested.length) {
      return Response.json({ error: "Vui lòng điền đủ thông tin nhận hoa và giỏ hàng." }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(deliveryDate)) {
      return Response.json({ error: "Ngày giao chưa hợp lệ." }, { status: 400 });
    }

    const quantities = new Map<string, number>();
    for (const item of requested) {
      const productId = cleanText(item.productId, 100);
      const quantity = Math.min(20, Math.max(1, Math.floor(Number(item.quantity) || 1)));
      if (productId) quantities.set(productId, (quantities.get(productId) ?? 0) + quantity);
    }
    const ids = [...quantities.keys()];
    if (!ids.length) return Response.json({ error: "Giỏ hàng chưa hợp lệ." }, { status: 400 });

    const inventory = await getDb()
      .select()
      .from(products)
      .where(and(inArray(products.id, ids), eq(products.active, true)));
    if (inventory.length !== ids.length) {
      return Response.json({ error: "Có mẫu hoa không còn được phục vụ. Vui lòng chọn lại." }, { status: 409 });
    }

    const lineItems = inventory.map((product) => ({
      productId: product.id,
      name: product.name,
      image: product.image,
      quantity: quantities.get(product.id) ?? 1,
      price: product.price,
      subtotal: product.price * (quantities.get(product.id) ?? 1),
    }));
    const total = lineItems.reduce((sum, item) => sum + item.subtotal, 0);
    const id = `LFH-${new Date().getFullYear()}-${makeId("ORD").slice(-6).toUpperCase()}`;
    const createdAt = new Date().toISOString();

    await getDb().insert(orders).values({
      id,
      customerName,
      phone,
      email,
      recipientName,
      address,
      deliveryDate,
      deliverySlot,
      cardMessage,
      note,
      itemsJson: JSON.stringify(lineItems),
      total,
      status: "Mới",
      createdAt,
    });
    return Response.json({ orderId: id, total }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể gửi yêu cầu đặt hoa.";
    return Response.json({ error: message }, { status: 500 });
  }
}
