const DANGEROUS_PATTERN =
  /<\s*script|javascript:|onerror\s*=|onload\s*=|<\s*\/|</i;

export function hasDangerousContent(value: string): boolean {
  return DANGEROUS_PATTERN.test(value) || />/.test(value);
}

export function assertSafeText(value: string, fieldLabel: string): void {
  if (hasDangerousContent(value)) {
    throw new Error(`${fieldLabel} содержит недопустимые символы`);
  }
}
