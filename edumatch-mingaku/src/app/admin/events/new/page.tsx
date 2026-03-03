import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { EventForm } from "../_components/event-form";

export default async function NewEventPage() {
  const profile = await getCurrentProfile();
  if (profile?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return <EventForm mode="create" />;
}
