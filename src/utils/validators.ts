export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-\+]/g, "");
  // Accept 10 digits or 12 digits (with 91 country code)
  return /^[0-9]{10}$/.test(cleaned) || /^91[0-9]{10}$/.test(cleaned);
}

export function cleanPhone10(phone: string): string {
  const cleaned = phone.replace(/[\s\-\+]/g, "");
  if (cleaned.startsWith("91") && cleaned.length === 12) {
    return cleaned.slice(2);
  }
  return cleaned;
}

export function isValidEmail(email: string): boolean {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isValidRegPrefix(prefix: string): boolean {
  return /^[A-Z0-9]{2,6}$/.test(prefix.trim().toUpperCase());
}
