export function formatCurrency(amount: number | undefined | null): string {
  const val = typeof amount === "number" && !isNaN(amount) ? amount : 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);
}

export function formatDate(dateString?: string): string {
  if (!dateString) return "-";
  const parts = dateString.split("-");
  if (parts.length === 3) {
    // Expected format YYYY-MM-DD
    const [year, month, day] = parts;
    if (year.length === 4) {
      return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
    }
  }
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

export function formatDateTime(timestamp: any): string {
  if (!timestamp) return "-";
  let date: Date;
  if (timestamp?.toDate && typeof timestamp.toDate === "function") {
    date = timestamp.toDate();
  } else if (timestamp?.seconds) {
    date = new Date(timestamp.seconds * 1000);
  } else {
    date = new Date(timestamp);
  }
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDaysDifference(fromDateStr: string, toDateStr?: string): number {
  if (!fromDateStr) return 0;
  const from = new Date(fromDateStr);
  const to = toDateStr ? new Date(toDateStr) : new Date();
  if (isNaN(from.getTime()) || isNaN(to.getTime())) return 0;
  const diffTime = to.getTime() - from.getTime();
  return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
}

export function calculateAge(dobStr?: string): number {
  if (!dobStr) return 0;
  const birth = new Date(dobStr);
  if (isNaN(birth.getTime())) return 0;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return Math.max(0, age);
}
