/**
 * Indian Financial Year runs from 1st April to 31st March.
 * For example:
 * 15 May 2026 -> "2026-27"
 * 10 Feb 2027 -> "2026-27"
 * 10 Apr 2027 -> "2027-28"
 */
export function getFinancialYearKey(dateString?: string): string {
  const date = dateString ? new Date(dateString) : new Date();
  if (isNaN(date.getTime())) {
    const fallback = new Date();
    const y = fallback.getFullYear();
    const m = fallback.getMonth() + 1;
    const fyYear = m >= 4 ? y : y - 1;
    return `${fyYear}-${String(fyYear + 1).slice(-2)}`;
  }
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12
  const fyYear = month >= 4 ? year : year - 1;
  return `${fyYear}-${String(fyYear + 1).slice(-2)}`;
}

export function getCurrentFinancialYearKey(): string {
  return getFinancialYearKey();
}
