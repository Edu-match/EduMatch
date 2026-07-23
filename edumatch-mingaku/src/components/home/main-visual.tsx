import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";

const featuredItems = [
  {
    id: 1,
    title: "2024年度、教育現場で注目のICTツール5選",
    image: "https://placehold.co/800x450/e0f2fe/0369a1?text=Featured+1",
    category: "特集",
    date: "2024-01-15",
  },
  {
    id: 2,
    title: "GIGAスクール構想の最新動向と今後の展望",
    image: "https://placehold.co/800x450/dbeafe/1e40af?text=Featured+2",
    category: "注目記事",
    date: "2024-01-12",
  },
  {
    id: 3,
    title: "オンライン授業を効果的にする3つのポイント",
    image: "https://placehold.co/800x450/e0e7ff/4338ca?text=Featured+3",
    category: "特集",
    date: "2024-01-10",
  },
  {
    id: 4,
    title: "小学校プログラミング教育の実践例",
    image: "https://placehold.co/800x450/f3e8ff/7c3aed?text=Featured+4",
    category: "注目記事",
    date: "2024-01-08",
  },
];

export function MainVisual() {
  return (
    <div className="relative mb-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {featuredItems.slice(0, 4).map((item) => (
          <Link key={item.id} href={`/articles/${item.id}`}>
            <Card className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative w-full aspect-video overflow-hidden">
                <Image
                  src={item.image}
                  alt={item.title}
                  fill
                  className="object-contain"
                />
              </div>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-primary">
                    {item.category}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(item.date).toLocaleDateString("ja-JP")}
                  </span>
                </div>
                <h3 className="font-semibold text-sm line-clamp-2">
                  {item.title}
                </h3>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
