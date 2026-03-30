"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { markInAppNotificationRead } from "@/app/_actions/in-app-notifications";

type Props = {
  href: string;
  notificationId: string;
  read: boolean;
  className?: string;
  children: React.ReactNode;
};

/**
 * 未読のサイト内通知を開くときに既読化する（通知レコードは残す）
 */
export function InAppNotificationReadLink({
  href,
  notificationId,
  read,
  className,
  children,
}: Props) {
  const router = useRouter();

  async function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (read) return;
    e.preventDefault();
    await markInAppNotificationRead(notificationId);
    router.refresh();
    if (href.startsWith("http://") || href.startsWith("https://")) {
      window.open(href, "_blank", "noopener,noreferrer");
    } else {
      router.push(href);
    }
  }

  if (href.startsWith("http://") || href.startsWith("https://")) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        onClick={handleClick}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}
