const imagePath = /^(?:\/(?!\/)|https?:\/\/)/i;

export function productImages(primary: string, stored?: string | null) {
  try {
    const parsed = JSON.parse(stored || "[]");
    if (Array.isArray(parsed)) {
      const images = parsed.filter((value): value is string => typeof value === "string" && imagePath.test(value));
      if (images.length) return [...new Set(images)].slice(0, 12);
    }
  } catch {}
  return primary && imagePath.test(primary) ? [primary] : [];
}

export function imageJson(images: string[], fallback: string) {
  const clean = [...new Set(images.filter((value) => imagePath.test(value)))].slice(0, 12);
  return JSON.stringify(clean.length ? clean : [fallback]);
}
