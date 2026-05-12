import Link from "next/link";
import { OPERATOR_INFO } from "@/lib/operator-info";

export function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    product: [
      { href: "/articles", label: "記事一覧" },
      { href: "/services", label: "サービス一覧" },
      { href: "/events", label: "セミナー・イベント情報" },
      { href: "/forum", label: "井戸端会議" },
    ],
    company: [
      { href: "/about", label: "運営について" },
      { href: "/contact", label: "お問い合わせ" },
    ],
    legal: [
      { href: "/terms", label: "利用規約" },
      { href: "/privacy", label: "プライバシーポリシー" },
    ],
  };

  return (
    <footer className="w-full border-t bg-muted/40">
      <div className="container py-8 md:py-12 lg:py-16">
        <div className="grid grid-cols-2 gap-6 sm:gap-8 md:grid-cols-4">
          {/* Logo & Description */}
          <div className="col-span-2 md:col-span-1 space-y-3">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-xl font-bold text-primary">エデュマッチ</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              教育の未来を見つける、つながる
            </p>
          </div>

          {/* Product Links */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">プロダクト</h3>
            <ul className="space-y-2">
              {footerLinks.product.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">会社情報</h3>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">法的情報</h3>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 md:mt-12 border-t pt-6 md:pt-8">
          <p className="text-center text-xs sm:text-sm text-muted-foreground">
            © {currentYear} エデュマッチ（主催：{OPERATOR_INFO.organizer} / 運営：{OPERATOR_INFO.operator}）. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
