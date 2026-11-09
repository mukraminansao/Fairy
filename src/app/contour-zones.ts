export const contourZones = [
  { id: "cheekbones", name: "Cheekbones" },
  { id: "lowerCheeks", name: "Lower cheeks" },
  { id: "nose", name: "Nose" },
] as const;

export type ContourZone = (typeof contourZones)[number]["id"];
export type ContourPlacement = Partial<Record<ContourZone, number>>;

export function readContourPlacement(value: unknown): ContourPlacement | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const source = value as Record<string, unknown>;
  return Object.fromEntries(contourZones.flatMap(({ id }) => {
    const amount = source[id];
    return typeof amount === "number" && Number.isInteger(amount) && amount >= 0 && amount <= 100 ? [[id, amount]] : [];
  }));
}


