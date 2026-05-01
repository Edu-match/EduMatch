import { getTalentMatchingCompanies } from "@/app/_actions/talent";
import TalentClientPage from "./talent-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "人材マッチング | エデュマッチ",
  description:
    "教育業界で採用を行っている事業者と、教育分野で活躍したい方をつなぐ人材マッチングサービス。",
};

export default async function TalentPage() {
  const companies = await getTalentMatchingCompanies();
  return <TalentClientPage companies={companies} />;
}
