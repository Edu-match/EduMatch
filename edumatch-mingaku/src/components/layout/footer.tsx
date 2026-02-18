import Link from "next/link";

export function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    product: [
      { href: "/articles", label: "記事一覧" },
      { href: "/services", label: "サービス一覧" },
      { href: "/events", label: "セミナー・イベント情報" },
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
      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Logo & Description */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center space-x-2">
              <span className="absolute left-[17px] text-xl font-bold text-primary">Edumatch</span>
            </Link>
            <p className="absolute left-[17px] text-sm text-muted-foreground">
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
        <div className="mt-12 border-t pt-8">
          <p className="text-center text-sm text-muted-foreground">
            © {currentYear} Edumatch. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
