export const slugify = (input: string): string =>
  String(input ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

export const toNumber = (
  value: { toString(): string } | number | null | undefined
): number => {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number(value.toString());
};

export const round2 = (n: number) => Math.round(n * 100) / 100;
