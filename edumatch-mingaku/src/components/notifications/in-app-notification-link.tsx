import Link from "next/link";

type Props = {
  href: string;
  className?: string;
  children: React.ReactNode;
};

export function InAppNotificationLink({ href, className, children }: Props) {
  if (href.startsWith("http://") || href.startsWith("https://")) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
