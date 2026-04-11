export function calculateFee(amount: number) {
  const fee = (amount * 50) / 10000;
  return { fee, payout: amount - fee };
}

export function getStateLabel(state: string): string {
  const map: Record<string, string> = {
    Locked: "Funds Locked", Delivered: "Awaiting Review",
    Released: "Paid", Disputed: "In Dispute", Refunded: "Refunded",
  };
  return map[state] ?? state;
}

export function getHoursUntilAutoRelease(deliveredAt: Date): number {
  return Math.max(0, 48 - (Date.now() - deliveredAt.getTime()) / 3_600_000);
}