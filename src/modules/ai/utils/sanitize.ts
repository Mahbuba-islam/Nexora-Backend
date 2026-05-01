/**
 * Light input sanitization for prompts.
 * - Strips null bytes and most control chars
 * - Collapses whitespace
 * - Caps length
 * - Removes obvious prompt-injection scaffolding
 */
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const INJECTION_PATTERNS = [
  /ignore (all|previous|above) (instructions|prompts)/gi,
  /you are now/gi,
  /system prompt:/gi,
];

export const sanitizeText = (input: unknown, maxLength = 8000): string => {
  if (typeof input !== "string") return "";
  let text = input.replace(CONTROL_CHARS, " ").replace(/\s+/g, " ").trim();
  for (const pattern of INJECTION_PATTERNS) {
    text = text.replace(pattern, "[filtered]");
  }
  if (text.length > maxLength) text = text.slice(0, maxLength);
  return text;
};

export const sanitizeObject = <T extends Record<string, unknown>>(obj: T): T => {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (typeof value === "string") {
      out[key] = sanitizeText(value);
    } else if (Array.isArray(value)) {
      out[key] = value.map((v) =>
        typeof v === "string"
          ? sanitizeText(v)
          : v && typeof v === "object"
            ? sanitizeObject(v as Record<string, unknown>)
            : v
      );
    } else if (value && typeof value === "object") {
      out[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      out[key] = value;
    }
  }
  return out as T;
};
