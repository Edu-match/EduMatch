import { getTalentMatchingProfiles } from "@/app/_actions/talent";
import TalentClientPage from "./talent-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "人材マッチング | エデュマッチ",
  description:
    "講演・講師・仕事の依頼ができる教育分野の専門家・企業を探せる人材マッチングサービス。",
};

export default async function TalentPage() {
  const profiles = await getTalentMatchingProfiles();
  return <TalentClientPage profiles={profiles} />;
}
