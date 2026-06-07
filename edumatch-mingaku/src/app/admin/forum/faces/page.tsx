import { redirect } from "next/navigation";
import { getCurrentUserRole } from "@/app/_actions/user";
import { FacesAdminClient } from "./faces-admin-client";

export default async function AdminForumFacesPage() {
  const role = await getCurrentUserRole();
  if (role !== "ADMIN") {
    redirect("/dashboard");
  }
  return <FacesAdminClient />;
}
