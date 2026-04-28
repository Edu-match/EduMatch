import { redirect } from "next/navigation";
import { getCurrentUserRole } from "@/app/_actions/user";
import { AdminForumClient } from "./admin-forum-client";

export default async function AdminForumPage() {
  const role = await getCurrentUserRole();
  if (role !== "ADMIN") {
    redirect("/dashboard");
  }

  return <AdminForumClient />;
}
