import { getAllServices } from "@/app/_actions/services";
import CompareClientPage from "./compare-client";

export const dynamic = "force-dynamic";

export default async function ComparePage() {
  const services = await getAllServices();
  return <CompareClientPage initialServices={services} />;
}
