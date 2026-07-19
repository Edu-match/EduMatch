"use client";

import { useEffect, useRef, useState } from "react";
import { QrCode, Search, Camera, X, CheckCircle2, Clock, User, Mail, Phone, MapPin, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

type Session = { id: string; title: string; location: string; startsAt: string | null; status: string; checkedInAt: string | null };
type Result = { found: boolean; ticketToken?: string; user?: { name: string; email: string; phone: string | null; address: string | null; postal: string | null }; sessions?: Session[] };

function fmt(d: string | null): string {
  if (!d) return "";
  try { return new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(d)); } catch { return ""; }
}

/** QRから token を取り出す（?token / パス / 生token に対応）。 */
function tokenFromScan(text: string): string {
  try {
    const u = new URL(text);
    const q = u.searchParams.get("token");
    if (q) return q;
    return u.pathname.split("/").filter(Boolean).pop() || text;
  } catch {
    const m = text.match(/\/(?:checkin|ticket)\/([^/?#]+)/);
    return m ? m[1] : text.trim();
  }
}

export function KaikanCheckinPanel({ initialToken }: { initialToken?: string }) {
  const [token, setToken] = useState(initialToken ?? "");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);

  // QRから開かれた（?token付き）場合は自動照会
  useEffect(() => {
    if (initialToken) lookup(initialToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function lookup(t: string) {
    const q = t.trim();
    if (!q) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const r = await fetch(`/api/kaikan/admin/lookup?token=${encodeURIComponent(q)}`);
      const d: Result = await r.json();
      if (!r.ok) { setError((d as unknown as { error?: string }).error || "照会に失敗しました"); }
      else if (!d.found) { setError("該当するチケットが見つかりません"); }
      else setResult(d);
    } catch { setError("通信エラー"); } finally { setLoading(false); }
  }

  async function checkIn(sessionId: string) {
    setNotice(null);
    try {
      const r = await fetch("/api/kaikan/admin/lookup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ applicationId: sessionId }) });
      const d = await r.json();
      if (r.ok && d.ok) {
        setResult((prev) => prev && prev.sessions ? { ...prev, sessions: prev.sessions.map((s) => s.id === sessionId ? { ...s, status: "checked_in", checkedInAt: d.session.checkedInAt } : s) } : prev);
        // 二重受付防止：既に受付済みだった場合は警告し、初回受付時刻を維持する。
        if (d.alreadyCheckedIn) {
          setNotice(`このプログラムは既に受付済みです${d.session?.checkedInAt ? `（${fmt(d.session.checkedInAt)} 受付）` : ""}`);
        }
      } else {
        setNotice(d?.error || "受付に失敗しました");
      }
    } catch { setNotice("通信エラーで受付できませんでした"); }
  }

  async function startScan() {
    setError(null);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const el = document.getElementById("kaikan-qr-reader");
      if (!el) return;
      const scanner = new Html5Qrcode("kaikan-qr-reader");
      scannerRef.current = { stop: () => scanner.stop().then(() => scanner.clear()) };
      setScanning(true);

      const onDecode = async (decoded: string) => {
        const t = tokenFromScan(decoded);
        setToken(t);
        await stopScan();
        lookup(t);
      };
      const config = { fps: 10, qrbox: { width: 220, height: 220 } };

      // PC（ノートPC等）対応：背面カメラ指定が無い端末が多いため、まず接続カメラを列挙し
      // 背面（environment/back）を優先、無ければ先頭のカメラを deviceId 指定で起動する。
      // 列挙に失敗した場合は facingMode 指定にフォールバック。
      try {
        const cameras = await Html5Qrcode.getCameras();
        if (cameras && cameras.length > 0) {
          const back = cameras.find((c) => /back|rear|environment|背面/i.test(c.label));
          const camId = (back ?? cameras[cameras.length - 1]).id;
          await scanner.start({ deviceId: { exact: camId } }, config, onDecode, () => {});
        } else {
          await scanner.start({ facingMode: "environment" }, config, onDecode, () => {});
        }
      } catch {
        await scanner.start({ facingMode: "environment" }, config, onDecode, () => {});
      }
    } catch (e) {
      setScanning(false);
      setError("カメラを起動できませんでした（ブラウザのカメラ権限を許可してください。PCでは内蔵/接続カメラが必要です）");
      console.error(e);
    }
  }

  async function stopScan() {
    try { await scannerRef.current?.stop(); } catch { /* noop */ }
    scannerRef.current = null;
    setScanning(false);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">QRコードを読み取るか、受付番号を入力してチケットを照会します。</p>

      {/* 手入力 */}
      <form onSubmit={(e) => { e.preventDefault(); lookup(token); }} className="flex gap-2">
        <Input
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="受付番号（例：12345-67890）"
          inputMode="numeric"
          className="flex-1"
        />
        <button type="submit" disabled={loading} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-sm transition-[color,background-color,box-shadow,transform] duration-150 hover:bg-primary-hover hover:shadow-md active:scale-[0.98] active:shadow-sm disabled:opacity-50 pointer-coarse:min-h-11">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} 照会
        </button>
      </form>

      {/* QRスキャン */}
      <div className="rounded-xl border bg-muted/20 p-3">
        {!scanning ? (
          <button type="button" onClick={startScan} className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-background px-4 py-2 text-sm font-bold outline-none transition-[color,background-color,box-shadow] duration-150 hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 pointer-coarse:min-h-11">
            <Camera className="h-4 w-4" /> カメラでQRを読み取る
          </button>
        ) : (
          <button type="button" onClick={stopScan} className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-background px-4 py-2 text-sm font-bold outline-none transition-[color,background-color,box-shadow] duration-150 hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 pointer-coarse:min-h-11">
            <X className="h-4 w-4" /> スキャンを停止
          </button>
        )}
        <div id="kaikan-qr-reader" className={`mt-3 overflow-hidden rounded-lg ${scanning ? "block" : "hidden"}`} style={{ maxWidth: 320 }} />
      </div>

      {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      {notice && <p className="rounded-md bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800">{notice}</p>}

      {/* 照会結果 */}
      {result?.found && result.user && result.sessions && (
        <div className="rounded-2xl border bg-card p-4">
          <div className="flex items-center gap-2 text-base font-bold"><QrCode className="h-4 w-4 text-primary" /> 申込者情報</div>
          <dl className="mt-3 grid grid-cols-1 gap-1.5 text-sm sm:grid-cols-2">
            <div className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-muted-foreground" />{result.user.name}</div>
            <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" />{result.user.email || "—"}</div>
            <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" />{result.user.phone || "—"}</div>
            <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-muted-foreground" />{[result.user.postal, result.user.address].filter(Boolean).join(" ") || "—"}</div>
          </dl>

          <div className="mt-4 text-sm font-bold">参加プログラム（{result.sessions.length}件）</div>
          <ul className="mt-2 space-y-2">
            {result.sessions.map((s) => {
              const done = s.status === "checked_in";
              return (
                <li key={s.id} className="flex items-center justify-between gap-3 rounded-lg border bg-background p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{s.title}</p>
                    <p className="text-[11px] text-muted-foreground">{[fmt(s.startsAt), s.location].filter(Boolean).join(" ・ ")}</p>
                  </div>
                  {done ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> 受付済{s.checkedInAt ? `（${fmt(s.checkedInAt)}）` : ""}</span>
                  ) : (
                    <button type="button" onClick={() => checkIn(s.id)} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-primary px-4 py-2.5 pointer-coarse:min-h-11 text-xs font-bold text-primary-foreground shadow-sm transition-[color,background-color,box-shadow,transform] duration-150 hover:bg-primary-hover hover:shadow-md active:scale-[0.98] active:shadow-sm"><Clock className="h-3.5 w-3.5" /> 受付する</button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
