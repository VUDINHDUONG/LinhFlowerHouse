import { getDb } from "../../../../db";
import { settings } from "../../../../db/schema";
import { cleanText, ensureSeedData, requireAdminResponse } from "../../../../lib/cms";

const editableKeys = ["announcement", "heroTitle", "heroSubtitle", "contactPhone", "contactZalo", "contactInstagram"] as const;

export async function PATCH(request: Request) {
  const unauthorized = await requireAdminResponse(request);
  if (unauthorized) return unauthorized;
  try {
    await ensureSeedData();
    const payload = (await request.json()) as Record<string, unknown>;
    const now = new Date().toISOString();
    await Promise.all(
      editableKeys.map((key) =>
        getDb()
          .insert(settings)
          .values({ key, value: cleanText(payload[key], key === "heroSubtitle" ? 500 : 200), updatedAt: now })
          .onConflictDoUpdate({ target: settings.key, set: { value: cleanText(payload[key], key === "heroSubtitle" ? 500 : 200), updatedAt: now } }),
      ),
    );
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể lưu nội dung website.";
    return Response.json({ error: message }, { status: 500 });
  }
}
