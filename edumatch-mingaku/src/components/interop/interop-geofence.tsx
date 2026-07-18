"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MapPin, Sparkles, X } from "lucide-react";
import { ensureExternalUrl, type InteropSettings } from "@/lib/interop-settings";

type GeoSettings = Pick<
  InteropSettings,
  | "geofenceEnabled" | "venueLat" | "venueLng" | "venueRadiusM"
  | "exitTitle" | "exitMessage" | "exitCtaLabel" | "exitCtaUrl"
>;

const SHOWN_KEY = "interop_exit_shown";
const OPTIN_DISMISSED_KEY = "interop_geo_optin_dismissed";

/** 2点間の距離（メートル）。ハバーサイン。 */
function distanceM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * 会場（幕張メッセ）から出たことを検知して、バイブ＋「世界を出た」演出を表示する。
 * - セッション中に一度でも会場内を検知してから外に出たときのみ発火（誤発火防止）
 * - iOS Safari は Vibration 非対応のため、視覚演出を主役にする
 * - ?exitpreview=1 で演出を即プレビュー可能
 */
export function InteropGeofence({ settings }: { settings: GeoSettings }) {
  const [showExit, setShowExit] = useState(false);
  const [showOptIn, setShowOptIn] = useState(false);
  const wasInsideRef = useRef(false);
  const watchIdRef = useRef<number | null>(null);

  const fireExit = useCallback(() => {
    try { sessionStorage.setItem(SHOWN_KEY, "1"); } catch { /* noop */ }
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    // バイブ（対応端末のみ。遊園地のゲートを抜けるような3連）
    try { navigator.vibrate?.([70, 50, 140, 50, 220]); } catch { /* noop */ }
    setShowExit(true);
  }, []);

  const startWatch = useCallback(() => {
    if (!navigator.geolocation) return;
    setShowOptIn(false);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const d = distanceM(pos.coords.latitude, pos.coords.longitude, settings.venueLat, settings.venueLng);
        if (d <= settings.venueRadiusM) {
          wasInsideRef.current = true;
        } else if (wasInsideRef.current) {
          fireExit();
        }
      },
      () => { /* 許可拒否・取得失敗時は何もしない */ },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }
    );
  }, [settings.venueLat, settings.venueLng, settings.venueRadiusM, fireExit]);

  useEffect(() => {
    // プレビュー
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("exitpreview") === "1") {
      setShowExit(true);
      return;
    }
    if (!settings.geofenceEnabled) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    try { if (sessionStorage.getItem(SHOWN_KEY) === "1") return; } catch { /* noop */ }

    // 既に許可済みなら自動で監視開始、未許可ならオプトインを出す
    const perms = (navigator as Navigator & { permissions?: Permissions }).permissions;
    if (perms?.query) {
      perms.query({ name: "geolocation" as PermissionName })
        .then((res) => {
          if (res.state === "granted") startWatch();
          else if (res.state === "prompt") {
            try { if (sessionStorage.getItem(OPTIN_DISMISSED_KEY) !== "1") setShowOptIn(true); } catch { setShowOptIn(true); }
          }
        })
        .catch(() => setShowOptIn(true));
    } else {
      setShowOptIn(true);
    }

    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [settings.geofenceEnabled, startWatch]);

  const enable = () => {
    // ユーザー操作の中で許可を求める
    navigator.geolocation.getCurrentPosition(
      () => startWatch(),
      () => setShowOptIn(false),
      { enableHighAccuracy: true }
    );
  };

  const dismissOptIn = () => {
    setShowOptIn(false);
    try { sessionStorage.setItem(OPTIN_DISMISSED_KEY, "1"); } catch { /* noop */ }
  };

  return (
    <>
      {/* オプトイン（控えめなバナー） */}
      {showOptIn && !showExit && (
        <div className="pointer-events-none fixed inset-x-0 bottom-16 z-[55] flex justify-center px-4">
          <div
            className="pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl border px-4 py-3 text-sm shadow-xl backdrop-blur"
            style={{ background: "rgba(10,12,34,0.92)", borderColor: "rgba(150,170,255,0.3)", color: "#fff" }}
          >
            <MapPin className="h-5 w-5 shrink-0 text-indigo-300" />
            <p className="flex-1 text-[12px] leading-snug text-white/85">
              会場を出るとき、特別なご案内が届きます。位置情報の使用を許可しますか？
            </p>
            <button onClick={enable} className="shrink-0 rounded-full bg-gradient-to-r from-indigo-400 to-violet-500 px-3 py-1.5 text-[12px] font-bold text-white">
              許可する
            </button>
            <button onClick={dismissOptIn} aria-label="閉じる" className="shrink-0 text-white/45 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* 退出演出モーダル */}
      {showExit && <ExitOverlay settings={settings} onClose={() => setShowExit(false)} />}
    </>
  );
}

const EXIT_FX = `
  @keyframes itmExitIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes itmGateGlow { 0%,100% { opacity: 0.45; transform: scale(1); } 50% { opacity: 0.8; transform: scale(1.05); } }
  @keyframes itmRise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
`;

function ExitOverlay({ settings, onClose }: { settings: GeoSettings; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center px-5"
      style={{ animation: "itmExitIn 0.6s ease both" }}
    >
      <style>{EXIT_FX}</style>
      {/* 背景：夜明けのゲートを抜けるようなグラデーション */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 110%, rgba(255,170,90,0.35) 0%, rgba(120,60,160,0.4) 30%, rgba(10,10,35,0.96) 70%), #06070f",
        }}
      />
      {/* 光のゲート */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[120vmin] w-[120vmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(255,210,160,0.22) 0%, transparent 55%)",
          animation: "itmGateGlow 5s ease-in-out infinite",
        }}
      />

      <div className="relative z-10 w-full max-w-md text-center text-white" style={{ animation: "itmRise 0.8s ease 0.2s both" }}>
        <div className="mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur">
          <Sparkles className="h-7 w-7 text-amber-200" />
        </div>
        <h2 className="text-2xl font-bold leading-tight" style={{ textShadow: "0 0 24px rgba(255,190,130,0.4)" }}>
          {settings.exitTitle}
        </h2>
        <p className="mx-auto mt-4 max-w-sm whitespace-pre-line text-sm leading-relaxed text-white/80">
          {settings.exitMessage}
        </p>

        <a
          href={ensureExternalUrl(settings.exitCtaUrl, "https://edu-match.com/auth/login")}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-300 via-orange-400 to-rose-400 px-6 py-3.5 text-base font-bold text-[#3a1c10] shadow-xl shadow-orange-500/30 transition hover:brightness-110"
        >
          {settings.exitCtaLabel || "AIUEO BASEに無料登録"}
        </a>
        <button onClick={onClose} className="mt-4 block w-full text-sm font-bold text-white/55 hover:text-white">
          まだ会場にいる／閉じる
        </button>
      </div>
    </div>
  );
}
