import { redirect, notFound } from "next/navigation";
import { getCurrentUserRole } from "@/app/_actions/user";
import { prisma } from "@/lib/prisma";
import { InteropBackdrop } from "@/components/interop/interop-backdrop";
import { EditRoomForm } from "./edit-room-form";

export default async function EditForumRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const role = await getCurrentUserRole();
  if (role !== "ADMIN") {
    redirect("/dashboard");
  }
  const { id } = await params;
  const room = await prisma.forumRoom.findUnique({
    where: { id },
    select: { id: true, name: true, description: true, ai_discussion: true },
  });
  if (!room) notFound();

  return (
    <div className="dark relative min-h-screen text-white [&_[class*='bg-card']]:border-white/10 [&_[class*='bg-card']]:bg-white/[0.06] [&_[class*='bg-card']]:backdrop-blur-sm">
      <InteropBackdrop themeMode="auto" showCityscape={false} />
      <div className="relative z-10">
        <EditRoomForm
          room={{
            id: room.id,
            name: room.name,
            description: room.description,
            aiDiscussion: room.ai_discussion,
          }}
        />
      </div>
    </div>
  );
}
