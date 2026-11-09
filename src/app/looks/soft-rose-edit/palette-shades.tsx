import type { CSSProperties } from "react";
import { eyeshadowShades, type TryOnPan } from "../../makeup-data";
import styles from "./makeup.module.css";

export function PaletteShades({ selectedId, onSelect, palette = eyeshadowShades, label = "Eyeshadow palette shades" }: {
  selectedId: string; onSelect: (id: string) => void; palette?: readonly TryOnPan[]; label?: string;
}) {
  const shade = palette.find(({ id }) => id === selectedId) ?? palette[0];
  return (
    <div>
      <dl className={styles.shade}><dt>Shade</dt><dd aria-live="polite">{shade.name}</dd></dl>
      <div className={styles.paletteSwatches} role="group" aria-label={label}>
        {palette.map((option) => (
          <button key={option.id} type="button" aria-pressed={shade.id === option.id}
            style={{ "--swatch": option.hex } as CSSProperties} onClick={() => onSelect(option.id)}>
            <span aria-hidden="true" />
            {option.name}
          </button>
        ))}
      </div>
    </div>
  );
}
