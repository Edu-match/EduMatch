"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, ArrowLeft } from "lucide-react";
import { submitMaterialRequest } from "@/app/_actions";
import type { ServiceWithProvider } from "@/app/_actions";

const PREFECTURES = [
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県",
  "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県",
  "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県",
  "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県",
];

type ProfileAddress = {
  name: string;
  email: string;
  phone: string | null;
  postal_code: string | null;
  prefecture: string | null;
  city: string | null;
  address: string | null;
};

type Props = {
  serviceId: string;
  service: ServiceWithProvider;
  profile: ProfileAddress | null;
};

export function RequestInfoForm({ serviceId, service, profile }: Props) {
  const router = useRouter();
  const [useAccountAddress, setUseAccountAddress] = useState(true);
  const [deliveryName, setDeliveryName] = useState(profile?.name ?? "");
  const [deliveryEmail, setDeliveryEmail] = useState(profile?.email ?? "");
  const [deliveryPhone, setDeliveryPhone] = useState(profile?.phone ?? "");
  const [deliveryPostalCode, setDeliveryPostalCode] = useState(profile?.postal_code ?? "");
  const [deliveryPrefecture, setDeliveryPrefecture] = useState(profile?.prefecture ?? "");
  const [deliveryCity, setDeliveryCity] = useState(profile?.city ?? "");
  const [deliveryAddress, setDeliveryAddress] = useState(profile?.address ?? "");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const hasAccountAddress = profile && [
    profile.postal_code,
    profile.prefecture,
    profile.city,
    profile.address,
  ].some(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const result = await submitMaterialRequest({
      serviceId,
      useAccountAddress,
      deliveryName: useAccountAddress ? undefined : deliveryName,
      deliveryEmail: useAccountAddress ? undefined : deliveryEmail,
      deliveryPhone: useAccountAddress ? null : (deliveryPhone || null),
      deliveryPostalCode: useAccountAddress ? null : (deliveryPostalCode || null),
      deliveryPrefecture: useAccountAddress ? null : (deliveryPrefecture || null),
      deliveryCity: useAccountAddress ? null : (deliveryCity || null),
      deliveryAddress: useAccountAddress ? null : (deliveryAddress || null),
      message: message || null,
    });
    setSubmitting(false);
    if (result.success && result.requestId) {
      router.push(`/request-info/complete?requestId=${result.requestId}`);
      return;
    }
    setError(result.error ?? "送信に失敗しました");
  };

  return (
    <div className="container py-8 space-y-6">
      <Button variant="ghost" asChild className="mb-2">
        <Link href={`/services/${serviceId}`}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          サービスに戻る
        </Link>
      </Button>

      <div>
        <h1 className="text-3xl font-bold mb-2">資料請求</h1>
        <p className="text-muted-foreground">
          「{service.title}」の資料を請求します
        </p>
      </div>

      <Card className="lg:max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            資料請求フォーム
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <label className="block text-sm font-medium mb-2">送付先の住所</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="addressType"
                    checked={useAccountAddress}
                    onChange={() => setUseAccountAddress(true)}
                    className="rounded-full"
                  />
                  登録住所で請求
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="addressType"
                    checked={!useAccountAddress}
                    onChange={() => setUseAccountAddress(false)}
                    className="rounded-full"
                  />
                  別の住所で請求
                </label>
              </div>
              {useAccountAddress && (
                <div className="p-4 rounded-lg bg-muted/50 text-sm">
                  {hasAccountAddress ? (
                    <p>
                      {profile?.name} / {profile?.email}<br />
                      {[profile?.postal_code, profile?.prefecture, profile?.city, profile?.address]
                        .filter(Boolean)
                        .join(" ")}
                      {profile?.phone && ` / ${profile.phone}`}
                    </p>
                  ) : (
                    <p className="text-muted-foreground">
                      登録住所が未設定です。<Link href="/profile/register" className="text-primary underline">プロファイル設定</Link>で住所を登録してください。
                    </p>
                  )}
                </div>
              )}
            </div>

            {!useAccountAddress && (
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium mb-2">お名前 <span className="text-red-500">*</span></label>
                    <Input
                      required
                      value={deliveryName}
                      onChange={(e) => setDeliveryName(e.target.value)}
                      placeholder="山田太郎"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium mb-2">メールアドレス（資料送付先） <span className="text-red-500">*</span></label>
                    <Input
                      type="email"
                      required
                      value={deliveryEmail}
                      onChange={(e) => setDeliveryEmail(e.target.value)}
                      placeholder="example@example.com"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium mb-2">電話番号</label>
                  <Input
                    value={deliveryPhone}
                    onChange={(e) => setDeliveryPhone(e.target.value)}
                    placeholder="090-1234-5678"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium mb-2">郵便番号</label>
                  <Input
                    value={deliveryPostalCode}
                    onChange={(e) => setDeliveryPostalCode(e.target.value)}
                    placeholder="123-4567"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium mb-2">都道府県</label>
                  <Select value={deliveryPrefecture} onValueChange={setDeliveryPrefecture}>
                    <SelectTrigger>
                      <SelectValue placeholder="選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {PREFECTURES.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium mb-2">市区町村</label>
                  <Input
                    value={deliveryCity}
                    onChange={(e) => setDeliveryCity(e.target.value)}
                    placeholder="渋谷区"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium mb-2">町名・番地・建物名</label>
                  <Input
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="道玄坂1-2-3"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-medium mb-2">ご要望・ご質問（任意）</label>
              <Textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="ご質問などがあればご記入ください"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={submitting || (useAccountAddress && !hasAccountAddress)}>
              {submitting ? "送信中…" : "資料請求を送信"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
