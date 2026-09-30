import { z } from "zod";

const text = (max: number) => z.string().trim().max(max);
const amount = z.number().int().finite().min(0).max(1_000_000_000);
export async function readPayload(request: Request) { return z.record(z.unknown()).parse(await request.json()); }
export const productInput = z.object({
  name: text(120).min(1), categoryId: text(100).min(1),
  occasion: text(80), description: text(700).min(1),
  image: text(500).refine((v) => /^\/(?!\/)/.test(v) || /^https?:\/\//i.test(v), "Đường dẫn ảnh không hợp lệ"),
  images: z.array(text(500).refine((v) => /^\/(?!\/)/.test(v) || /^https?:\/\//i.test(v))).min(1).max(12),
  badge: text(40), price: amount.min(1), stock: z.number().int().min(0).max(1_000_000),
  active: z.boolean(), featured: z.boolean(),
});
export const categoryInput = z.object({
  name: text(80).min(1), slug: text(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  sortOrder: z.number().int().min(0).max(99999), active: z.boolean(),
});
export const orderStatuses = ["Mới", "Đang xác nhận", "Đang chuẩn bị", "Đang giao", "Hoàn tất", "Đã hủy"] as const;
export const orderInput = z.object({
  customerName: text(80).min(1), phone: text(30).min(5), email: z.union([z.literal(""), text(120).email()]),
  recipientName: text(80).min(1), address: text(300).min(1),
  deliveryDate: text(10).regex(/^\d{4}-\d{2}-\d{2}$/).refine((s) => {
    const d = new Date(s); return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }),
  deliverySlot: text(80).min(1), cardMessage: text(400), note: text(400), status: z.enum(orderStatuses),
  items: z.array(z.object({ productId: text(100).min(1), name: text(120).min(1), image: text(500), price: amount.min(1), quantity: z.number().int().min(1).max(1000) })).min(1).max(100),
});
export function apiError(error: unknown) {
  if (error instanceof z.ZodError || error instanceof SyntaxError) {
    return Response.json({ error: "Thông tin chưa hợp lệ. Kiểm tra các trường bắt buộc, số tiền và số lượng." }, { status: 400 });
  }
  console.error("Admin request failed", error);
  return Response.json({ error: "Không thể lưu dữ liệu. Vui lòng thử lại." }, { status: 500 });
}

