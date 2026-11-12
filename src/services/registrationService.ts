import { doc, runTransaction } from "firebase/firestore";
import { db, isFirebaseConfigured } from "../firebase";
import { getFinancialYearKey } from "../utils/financialYear";

export async function generateRegistrationNumber(
  instituteId: string,
  regPrefix: string,
  admissionDate: string
): Promise<string> {
  const fyKey = getFinancialYearKey(admissionDate);
  const cleanPrefix = (regPrefix || "INST").trim().toUpperCase();

  if (isFirebaseConfigured && db) {
    try {
      const counterRef = doc(db, `institutes/${instituteId}/counters/${fyKey}`);
      let regNumber = "";

      await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        const currentSeq = counterDoc.exists() ? (counterDoc.data()?.seq || 0) : 0;
        const nextSeq = Number(currentSeq) + 1;
        transaction.set(counterRef, { seq: nextSeq }, { merge: true });
        regNumber = `${cleanPrefix}-${fyKey}-${String(nextSeq).padStart(4, "0")}`;
      });

      return regNumber;
    } catch (err) {
      console.error("Firestore transaction error generating reg number:", err);
    }
  }

  // Fallback unique sequential registration number based on time sequence
  const fallbackSeq = Math.floor(Date.now() % 9000) + 1000;
  return `${cleanPrefix}-${fyKey}-${fallbackSeq}`;
}
