import { requireProvider } from "@/lib/auth";
import { ServiceForm } from "./service-form";

export default async function ServiceSubmitPage() {
  await requireProvider();
  return <ServiceForm />;
}
