import { requireAuth } from "@/lib/auth";
import { ServiceForm } from "./service-form";

export default async function ServiceSubmitPage() {
  // 認証チェック
  await requireAuth();
  
  return <ServiceForm />;
}
