import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { categories, products } from "../../../db/schema";
import { ensureSeedData } from "../../../lib/cms";
import { productImages } from "../../../lib/product-images";

export async function GET() {
  try {
    await ensureSeedData();
    const [productRows, categoryRows] = await Promise.all([
      getDb()
        .select()
        .from(products)
        .where(eq(products.active, true))
        .orderBy(desc(products.featured), asc(products.name)),
      getDb()
        .select()
        .from(categories)
        .where(eq(categories.active, true))
        .orderBy(asc(categories.sortOrder)),
    ]);
    return Response.json({
      products: productRows.map(({ imagesJson, ...product }) => ({ ...product, images: productImages(product.image, imagesJson) })),
      categories: categoryRows,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể tải sản phẩm.";
    return Response.json({ error: message }, { status: 500 });
  }
}
