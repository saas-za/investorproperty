"use client";

/**
 * A number field that displays thousand separators while typing, and can
 * optionally allow decimals (hectares need them; money and counts don't).
 * `value` and `onChange` always carry the raw numeric string ("1234.5"),
 * never the formatted display string — callers do plain Number(value) math
 * without worrying about commas.
 */
export default function NumberInput({
  value,
  onChange,
  decimals = 0,
  placeholder,
  className,
  required,
  invalid,
}: {
  value: string;
  onChange: (raw: string) => void;
  decimals?: number;
  placeholder?: string;
  className?: string;
  required?: boolean;
  invalid?: boolean;
}) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    let raw = e.target.value.replace(/[^\d.]/g, "");
    if (decimals === 0) {
      raw = raw.replace(/\./g, "");
    } else {
      const firstDot = raw.indexOf(".");
      if (firstDot !== -1) {
        raw = raw.slice(0, firstDot + 1) + raw.slice(firstDot + 1).replace(/\./g, "");
      }
      const [intPart, decPart] = raw.split(".");
      if (decPart !== undefined) raw = `${intPart}.${decPart.slice(0, decimals)}`;
    }
    onChange(raw);
  }

  const display = (() => {
    if (value === "") return "";
    const trailingDot = decimals > 0 && value.endsWith(".") ? "." : "";
    const n = Number(value);
    if (!Number.isFinite(n)) return value;
    return n.toLocaleString("en-ZA", { maximumFractionDigits: decimals }) + trailingDot;
  })();

  return (
    <input
      type="text"
      inputMode="decimal"
      value={display}
      onChange={handleChange}
      placeholder={placeholder}
      required={required}
      className={`${className ?? ""} ${invalid ? "border-red-400 ring-1 ring-red-300" : ""}`}
    />
  );
}
