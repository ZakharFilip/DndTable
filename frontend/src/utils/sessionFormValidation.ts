const DANGEROUS_PATTERN =
  /<\s*script|javascript:|onerror\s*=|onload\s*=|<\s*\/|</i;

export function hasDangerousContent(value: string): boolean {
  return DANGEROUS_PATTERN.test(value) || />/.test(value);
}

export const SESSION_NAME_MAX = 100;
export const SESSION_DESCRIPTION_MAX = 200;

export function validateSessionName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Название обязательно";
  if (trimmed.length > SESSION_NAME_MAX) {
    return `Название не длиннее ${SESSION_NAME_MAX} символов`;
  }
  if (hasDangerousContent(trimmed)) return "Название содержит недопустимые символы";
  return null;
}

export function validateSessionDescription(description: string): string | null {
  const trimmed = description.trim();
  if (trimmed.length > SESSION_DESCRIPTION_MAX) {
    return `Описание не длиннее ${SESSION_DESCRIPTION_MAX} символов`;
  }
  if (hasDangerousContent(trimmed)) return "Описание содержит недопустимые символы";
  return null;
}
