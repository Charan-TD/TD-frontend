/*
 * Sample records for the Payments screens: there is no payments API yet. The first rows of each list are
 * the ones in the design; the rest are generated (with a fixed seed, so they never change between loads)
 * so the tabs and page counts match the designed totals. Replace these with query results later.
 */

function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T,>(random: () => number, items: readonly T[]) => items[Math.floor(random() * items.length)];
const code = (random: () => number, length: number, alphabet: string) => Array.from({ length }, () => alphabet[Math.floor(random() * alphabet.length)]).join("");
/** A list of statuses with exactly the given counts, in a fixed shuffled order. */
function statuses<T extends string>(random: () => number, counts: [T, number][]): T[] {
  const list = counts.flatMap(([status, count]) => Array<T>(count).fill(status));
  for (let i = list.length - 1; i > 0; i -= 1) { const j = Math.floor(random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
  return list;
}
const dayMonth = (date: Date) => date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const clock = (date: Date) => date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

/* ------------------------------------------------------------ transactions */

export type PaymentStatus = "Successful" | "Pending" | "Failed";
export type Payment = { id: string; when: string; order: string; method: string; amount: number; status: PaymentStatus };
export const METHODS = ["UPI", "Card", "Cash on delivery", "Net banking"] as const;

const paymentHead: Payment[] = [
  { id: "pay_Nk8O2x91", when: "12 Nov, 1:42 PM", order: "ORD-8KQ2-610245", method: "UPI", amount: 478, status: "Successful" },
  { id: "pay_Nk8P7c33", when: "12 Nov, 1:30 PM", order: "ORD-7HT3-509981", method: "Card", amount: 726, status: "Successful" },
  { id: "pay_Nk8M1a07", when: "12 Nov, 1:18 PM", order: "ORD-2PL9-448120", method: "UPI", amount: 278, status: "Pending" },
  { id: "pay_Nk8K0b55", when: "12 Nov, 1:05 PM", order: "ORD-9WD4-338712", method: "Cash on delivery", amount: 349, status: "Successful" },
  { id: "pay_Nk8J4t21", when: "12 Nov, 12:52 PM", order: "ORD-5YTU5H4Y", method: "UPI", amount: 376, status: "Failed" },
  { id: "pay_Nk8H9e66", when: "12 Nov, 12:40 PM", order: "ORD-4RE7-221309", method: "Net banking", amount: 249, status: "Successful" },
  { id: "pay_Nk8G2r18", when: "12 Nov, 12:21 PM", order: "ORD-6MN1-190044", method: "Card", amount: 612, status: "Successful" },
  { id: "pay_Nk8F5w40", when: "12 Nov, 12:02 PM", order: "ORD-3ZLDA7ZP", method: "UPI", amount: 450, status: "Successful" },
];

export const PAYMENT_TOTALS = { all: 6436, successful: 6214, failed: 204, pending: 18 };
export const COLLECTED_PER_DAY = [48, 52, 50, 61, 57, 67, 74, 70, 59, 64, 72, 79];

function buildPayments(): Payment[] {
  const random = rng(11);
  const rest = PAYMENT_TOTALS.all - paymentHead.length;
  const list = statuses<PaymentStatus>(random, [["Successful", PAYMENT_TOTALS.successful - 6], ["Failed", PAYMENT_TOTALS.failed - 1], ["Pending", PAYMENT_TOTALS.pending - 1]]);
  const start = new Date(2026, 10, 12, 12, 2).getTime();
  return [...paymentHead, ...Array.from({ length: rest }, (_, i) => {
    const at = new Date(start - (i + 1) * 2.6 * 60_000);
    const method = pick(random, ["UPI", "UPI", "UPI", "Card", "Card", "Cash on delivery", "Net banking"]);
    return {
      id: `pay_Nk${code(random, 6, "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGH")}`,
      when: `${dayMonth(at)}, ${clock(at)}`,
      order: `ORD-${code(random, 4, "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ")}-${code(random, 6, "0123456789")}`,
      method, amount: 150 + Math.floor(random() * 760), status: list[i],
    };
  })];
}
export const payments = buildPayments();

/* ----------------------------------------------------------------- payouts */

export type PayoutStatus = "Scheduled" | "Paid" | "On hold" | "Failed";
export type Payout = { id: string; restaurant: string; station: string; period: string; orders: number; amount: number; bank: string; status: PayoutStatus; note: string };

const payoutHead: Payout[] = [
  { id: "po-1", restaurant: "silver dum biryani", station: "Vijayawada Junction", period: "5 – 11 Nov", orders: 412, amount: 98460, bank: "SBI ••4821", status: "Scheduled", note: "Pays 15 Nov" },
  { id: "po-2", restaurant: "Paradise Station Cafe", station: "Secunderabad Junction", period: "5 – 11 Nov", orders: 386, amount: 102310, bank: "HDFC ••7390", status: "Scheduled", note: "Pays 15 Nov" },
  { id: "po-3", restaurant: "traindhaba cloud kitchen", station: "Secunderabad Junction", period: "29 Oct – 4 Nov", orders: 301, amount: 71240, bank: "ICICI ••1022", status: "Paid", note: "UTR 432918776510" },
  { id: "po-4", restaurant: "Hotel Kakatiya", station: "Warangal", period: "29 Oct – 4 Nov", orders: 144, amount: 33080, bank: "SBI ••5547", status: "Paid", note: "UTR 432918776511" },
  { id: "po-5", restaurant: "Annapurna Meals", station: "Kazipet Junction", period: "29 Oct – 4 Nov", orders: 98, amount: 21640, bank: "Axis ••3301", status: "Failed", note: "Bank details mismatch" },
  { id: "po-6", restaurant: "Chicken Dhaba", station: "Hyderabad Deccan", period: "29 Oct – 4 Nov", orders: 87, amount: 19920, bank: "Kotak ••8812", status: "On hold", note: "Documents pending" },
];
const payoutPlaces: [string, string][] = [["Coastal Spice Kitchen", "Mahim Junction"], ["Tandoori Nights Grill", "Secunderabad Junction"], ["Andhra Tiffin Express", "Vijayawada Junction"], ["Railway Spice Kitchen", "Hyderabad Deccan"], ["Deccan Biryani House", "Hyderabad Deccan"], ["Train Dhaba Express", "Warangal"], ["Vani Sweets", "Kazipet Junction"]];

function buildPayouts(): Payout[] {
  const random = rng(23);
  const list = statuses<PayoutStatus>(random, [["Scheduled", 47], ["Paid", 5]]);
  return [...payoutHead, ...list.map((status, i) => {
    const [restaurant, station] = payoutPlaces[i % payoutPlaces.length];
    const paid = status === "Paid";
    return {
      id: `po-${i + 7}`, restaurant, station, period: paid ? "29 Oct – 4 Nov" : "5 – 11 Nov", orders: 60 + Math.floor(random() * 340),
      amount: 12000 + Math.floor(random() * 88000), bank: `${pick(random, ["SBI", "HDFC", "ICICI", "Axis", "Kotak"])} ••${code(random, 4, "0123456789")}`,
      status, note: paid ? `UTR 4329187${code(random, 5, "0123456789")}` : "Pays 15 Nov",
    };
  })];
}
export const payouts = buildPayouts();

/* ------------------------------------------------------------- settlements */

export type Settlement = { id: string; date: string; payments: number; gross: number; fees: number; bankRef: string; status: "Settled" | "In transit" };
export const settlements: Settlement[] = [
  { id: "setl_NkA81q", date: "12 Nov 2026", payments: 1048, gross: 124600, fees: 2940, bankRef: "—", status: "In transit" },
  { id: "setl_Nk9Z4m", date: "11 Nov 2026", payments: 982, gross: 116300, fees: 2745, bankRef: "UTR 432911804772", status: "Settled" },
  { id: "setl_Nk9Y0c", date: "10 Nov 2026", payments: 1011, gross: 119800, fees: 2830, bankRef: "UTR 432910227410", status: "Settled" },
  { id: "setl_Nk9X7p", date: "9 Nov 2026", payments: 876, gross: 102900, fees: 2430, bankRef: "UTR 432909551203", status: "Settled" },
  { id: "setl_Nk9W2h", date: "8 Nov 2026", payments: 934, gross: 109700, fees: 2590, bankRef: "UTR 432908663985", status: "Settled" },
  ...Array.from({ length: 7 }, (_, i): Settlement => {
    const random = rng(40 + i);
    const gross = 98000 + Math.floor(random() * 22000);
    return { id: `setl_Nk9${code(random, 3, "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789")}`, date: `${7 - i} Nov 2026`, payments: 820 + Math.floor(random() * 220), gross, fees: Math.round(gross * 0.0236), bankRef: `UTR 4329071${code(random, 5, "0123456789")}`, status: "Settled" };
  }),
];

/* ----------------------------------------------------------------- refunds */

export type RefundStatus = "Processed" | "Initiated" | "Failed";
export type Refund = { id: string; requested: string; order: string; customer: string; reason: string; amount: number; backTo: string; status: RefundStatus };
export const REFUND_REASONS = ["Train late, food not delivered", "Restaurant cancelled", "Item out of stock", "Wrong item delivered", "Payment debited twice"] as const;

const refundHead: Refund[] = [
  { id: "rfnd_Nk8T1a", requested: "12 Nov", order: "ORD-IKL1-571348", customer: "Ravi Kumar", reason: "Train late, food not delivered", amount: 480, backTo: "UPI", status: "Processed" },
  { id: "rfnd_Nk8S9d", requested: "12 Nov", order: "ORD-IKL1-270650", customer: "Kiran T", reason: "Restaurant cancelled", amount: 270, backTo: "UPI", status: "Processed" },
  { id: "rfnd_Nk8R4k", requested: "12 Nov", order: "ORD-5YTU5H4Y", customer: "Deepa N", reason: "Item out of stock", amount: 376, backTo: "Card", status: "Initiated" },
  { id: "rfnd_Nk8Q2z", requested: "11 Nov", order: "ORD-3ZLDA7ZP", customer: "Vikram J", reason: "Wrong item delivered", amount: 189, backTo: "UPI", status: "Initiated" },
  { id: "rfnd_Nk8P6x", requested: "10 Nov", order: "ORD-1AB2-118230", customer: "Meena R", reason: "Payment debited twice", amount: 349, backTo: "Net banking", status: "Failed" },
];
const people = ["Ravi Kumar", "Kiran T", "Deepa N", "Vikram J", "Meena R", "Anil P", "Sana M", "Harsha V", "Lata S", "Naveen B"];

function buildRefunds(): Refund[] {
  const random = rng(57);
  const list = statuses<RefundStatus>(random, [["Processed", 84], ["Initiated", 5]]);
  return [...refundHead, ...list.map((status, i): Refund => ({
    id: `rfnd_Nk${code(random, 4, "0123456789abcdefghijklmnopqrstuvwxyz")}`, requested: `${Math.max(1, 10 - Math.floor(i / 8))} Nov`,
    order: `ORD-${code(random, 4, "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ")}-${code(random, 6, "0123456789")}`, customer: pick(random, people),
    reason: pick(random, REFUND_REASONS), amount: 120 + Math.floor(random() * 520), backTo: pick(random, ["UPI", "UPI", "Card", "Net banking"]), status,
  }))];
}
export const refunds = buildRefunds();
