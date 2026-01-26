import { getAllServices } from "@/app/_actions";
import { ServicesClient } from "./services-client";

export type ServiceForList = {
  id: string;
  name: string;
  description: string;
  category: string;
  image: string;
  price: string;
};

export default async function ServicesPage() {
  const services = await getAllServices();

  const serviceList: ServiceForList[] = services.map((service) => ({
    id: service.id,
    name: service.title,
    description: service.description,
    category: service.category,
    image: service.thumbnail_url || "https://placehold.co/300x200/e0f2fe/0369a1?text=Service",
    price: service.price_info,
  }));

  return <ServicesClient services={serviceList} />;
}
