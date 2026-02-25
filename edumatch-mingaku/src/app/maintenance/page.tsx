import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "メンテナンス中",
};

export default function MaintenancePage() {
  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <header className="flex justify-end p-4">
        <Link
          href="/admin-entry"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
        >
          管理者
        </Link>
      </header>
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-xl w-full space-y-6 text-center">
          <p className="text-xl font-medium leading-relaxed">
            【リニュアルに向けてメンテナンス作業中】
            <br />
            【復旧まで今しばらくお待ちください】
          </p>
          <div className="space-y-2 text-muted-foreground">
            <p>
              なお、急ぎ確認が必要な場合は、
              <br />
              緊急特設サーバー上で確認いただくことができます。
            </p>
            <p>
              緊急特設サーバー上でのアクセスを希望の場合は、
              <br />
              <a
                href="mailto:info@edu-match.com"
                className="text-primary underline hover:no-underline"
              >
                info@edu-match.com
              </a>
              （メンテナンス担当宛）にメッセージをください。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
