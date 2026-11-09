"use client";

import styles from "./shop.module.css";

export function BagOption({ product, value, options, disabled, onChange }: {
  product: string; value: string; options: { id: string; name: string; available: boolean }[];
  disabled?: boolean; onChange: (value: string) => void;
}) {
  if (!options.some((option) => option.id !== value)) return null;
  return <label className={styles.bagOption}>
    Change option
    <select aria-label={"Change option for " + product} value={value} disabled={disabled}
      onChange={(event) => onChange(event.currentTarget.value)}>
      {!options.some((option) => option.id === value) && <option value={value}>Current option</option>}
      {options.map(({ id, name, available }) =>
        <option key={id} value={id} disabled={!available && id !== value}>{name}{available ? "" : " · Unavailable"}</option>)}
    </select>
  </label>;
}
