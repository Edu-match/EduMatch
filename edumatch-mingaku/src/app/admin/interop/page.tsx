import { redirect } from "next/navigation";
import { getCurrentUserRole } from "@/app/_actions/user";
import { InteropAdminClient } from "./interop-admin-client";

export default async function AdminInteropPage() {
  const role = await getCurrentUserRole();
  if (role !== "ADMIN") {
    redirect("/dashboard");
  }
  return <InteropAdminClient />;
}
