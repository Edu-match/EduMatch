// 残席状況の共通ロジック。定員の実数は一般公開せず（裏側で制限のみ）、
// 満席 / 残りわずか（残り10席未満）だけをユーザーに表示する。
export type SeatStatus = { label: string; tone: "full" | "low" };

/** applied=申込済数, capacity=定員(null=無制限)。表示すべき状況が無ければ null。 */
export function seatStatus(applied: number, capacity: number | null | undefined): SeatStatus | null {
  if (capacity == null) return null;
  const remaining = capacity - applied;
  if (remaining <= 0) return { label: "満席", tone: "full" };
  if (remaining < 10) return { label: "残りわずか", tone: "low" };
  return null;
}
