import { getShopSettings } from "../../../lib/cms";

export async function GET() {
  try {
    return Response.json({ settings: await getShopSettings() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể tải thông tin shop.";
    return Response.json({ error: message }, { status: 500 });
  }
}
