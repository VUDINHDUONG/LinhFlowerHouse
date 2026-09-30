import { asc, desc } from "drizzle-orm";
import { getDb } from "../../../../db";
import { categories, orders, products } from "../../../../db/schema";
import { ensureSeedData, getShopSettings, requireAdminResponse } from "../../../../lib/cms";
import { productImages } from "../../../../lib/product-images";

export async function GET() {
  const unauthorized = await requireAdminResponse();
  if (unauthorized) return unauthorized;
  try {
    await ensureSeedData();
    const db = getDb();
    const [productRows, categoryRows, orderRows, shopSettings] = await Promise.all([
      db.select().from(products).orderBy(desc(products.createdAt)),
      db.select().from(categories).orderBy(asc(categories.sortOrder)),
      db.select().from(orders).orderBy(desc(orders.createdAt)),
      getShopSettings(),
    ]);
    const revenue = orderRows
      .filter((order) => order.status !== "Đã hủy")
      .reduce((total, order) => total + order.total, 0);
    return Response.json({
      products: productRows.map(({ imagesJson, ...product }) => ({ ...product, images: productImages(product.image, imagesJson) })),
      categories: categoryRows,
      orders: orderRows,
      settings: shopSettings,
      dashboard: {
        products: productRows.filter((product) => product.active).length,
        newOrders: orderRows.filter((order) => order.status === "Mới").length,
        orders: orderRows.length,
        revenue,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể tải CMS.";
    return Response.json({ error: message }, { status: 500 });
  }
}
