import { redirect } from "next/navigation";
import { FEATURES } from "@/lib/features";

export default function PaymentLayout({ children }: { children: React.ReactNode }) {
  if (!FEATURES.PAID_PLANS) {
    redirect("/");
  }

  return <>{children}</>;
}
