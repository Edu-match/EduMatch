import Link from "next/link";
import { useTranslations } from "next-intl";
import { OPERATOR_INFO } from "@/lib/operator-info";

export function Footer() {
  const t = useTranslations();
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    product: [
      { href: "/services", label: t("nav.services") },
      { href: "/articles", label: t("nav.articles") },
      { href: "/forum", label: t("nav.forum") },
      { href: "/events", label: t("nav.events") },
      { href: "/matching", label: t("sideMenu.matching") },
      { href: "/videos", label: t("sideMenu.videos") },
      { href: "/compare", label: t("sideMenu.compare") },
      { href: "/ai-kentei", label: t("sideMenu.aiKentei") },
    ],
    company: [
      { href: "/about", label: t("nav.about") },
      { href: "/companies", label: t("nav.companies") },
      { href: "/contact", label: t("nav.contact") },
      { href: "/help", label: t("sideMenu.help") },
    ],
    legal: [
      { href: "/terms", label: t("nav.terms") },
      { href: "/privacy", label: t("nav.privacy") },
    ],
  };

  return (
    <footer className="w-full border-t border-border/60 bg-white">
      <div className="container py-8 md:py-12 lg:py-16">
        <div className="grid grid-cols-2 gap-6 sm:gap-8 md:grid-cols-4">
          {/* Logo & Description */}
          <div className="col-span-2 md:col-span-1 space-y-3">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-xl font-bold text-primary">{t("common.siteName")}</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              {t("common.tagline")}
            </p>
          </div>

          {/* Product Links */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">{t("footer.product")}</h3>
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
            <h3 className="text-sm font-semibold">{t("footer.company")}</h3>
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
            <h3 className="text-sm font-semibold">{t("footer.legal")}</h3>
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
            {t("footer.copyright", {
              year: currentYear,
              operator: OPERATOR_INFO.operator,
              organizer: OPERATOR_INFO.organizer,
            })}
          </p>
        </div>
      </div>
    </footer>
  );
}
