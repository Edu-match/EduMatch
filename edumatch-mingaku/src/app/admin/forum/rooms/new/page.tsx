import { redirect } from "next/navigation";
import { getCurrentUserRole } from "@/app/_actions/user";
import { InteropBackdrop } from "@/components/interop/interop-backdrop";
import { NewRoomForm } from "./new-room-form";

export default async function NewForumRoomPage() {
  const role = await getCurrentUserRole();
  if (role !== "ADMIN") {
    redirect("/dashboard");
  }
  return (
    <div className="dark relative min-h-screen text-white [&_[class*='bg-card']]:border-white/10 [&_[class*='bg-card']]:bg-white/[0.06] [&_[class*='bg-card']]:backdrop-blur-sm">
      <InteropBackdrop themeMode="auto" showCityscape={false} />
      <div className="relative z-10">
        <NewRoomForm />
      </div>
    </div>
  );
}
