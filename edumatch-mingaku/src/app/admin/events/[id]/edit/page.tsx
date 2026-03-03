import { redirect, notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { getEventById } from "@/app/_actions/events";
import { EventForm } from "../../_components/event-form";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await getCurrentProfile();
  if (profile?.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const { id } = await params;
  const event = await getEventById(id);
  if (!event) {
    notFound();
  }

  return (
    <EventForm
      mode="edit"
      id={id}
      defaultValues={{
        title: event.title,
        description: event.description,
        event_date: event.event_date ?? "",
        venue: event.venue ?? "",
        company: event.company ?? "",
        external_url: event.external_url ?? "",
      }}
    />
  );
}
