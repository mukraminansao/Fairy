export function catalogFrom(value: string | string[] | undefined) {
  if (typeof value !== "string" || value.length > 600 || !/^\/shop(?:\?|$)/.test(value)) return;
  const { searchParams } = new URL(value, "https://fairy.invalid");
  const params = new URLSearchParams();
  for (const key of ["category", "q", "type", "price", "sort", "page"]) {
    const field = searchParams.get(key);
    if (field) params.set(key, field);
  }
  return params.size ? "/shop?" + params : "/shop";
}

export const catalogAnchor = (slug: string) => "catalog-product-" + encodeURIComponent(slug);
