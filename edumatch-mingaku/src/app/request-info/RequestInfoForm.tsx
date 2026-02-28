"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileText, ArrowLeft } from "lucide-react";
import { submitMaterialRequest, submitMaterialRequestBatch } from "@/app/_actions";
import type { ServiceWithProvider } from "@/app/_actions";

type ProfileAddress = {
  name: string;
  email: string;
  phone: string | null;
  organization: string | null;
};

type PropsSingle = {
  serviceId: string;
  service: ServiceWithProvider;
  profile: ProfileAddress | null;
};

type PropsBatch = {
  serviceIds: string[];
  services: ServiceWithProvider[];
  profile: ProfileAddress | null;
};

type Props = PropsSingle | PropsBatch;

function isBatch(props: Props): props is PropsBatch {
  return "serviceIds" in props && Array.isArray(props.serviceIds);
}

export function RequestInfoForm(props: Props) {
  const router = useRouter();
  const isBatchMode = isBatch(props);
  const serviceId = !isBatchMode ? props.serviceId : undefined;
  const service = !isBatchMode ? props.service : undefined;
  const services = isBatchMode ? props.services : undefined;
  const profile = props.profile;

  const [deliveryName, setDeliveryName] = useState(profile?.name ?? "");
  const [deliveryEmail, setDeliveryEmail] = useState(profile?.email ?? "");
  const [deliveryOrganization, setDeliveryOrganization] = useState(profile?.organization ?? "");
  const [deliveryPhone, setDeliveryPhone] = useState(profile?.phone ?? "");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (profile) {
      setDeliveryName(profile.name);
      setDeliveryEmail(profile.email);
      setDeliveryOrganization(profile.organization ?? "");
      setDeliveryPhone(profile.phone ?? "");
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!deliveryName.trim()) {
      setError("お名前を入力してください");
      return;
    }
    if (!deliveryEmail.trim()) {
      setError("メールアドレスを入力してください");
      return;
    }

    setSubmitting(true);
    const base = {
      deliveryName: deliveryName.trim(),
      deliveryEmail: deliveryEmail.trim(),
      deliveryOrganization: deliveryOrganization?.trim() || null,
      deliveryPhone: deliveryPhone || null,
      message: message || null,
    };
    if (isBatchMode && props.serviceIds.length > 0) {
      const result = await submitMaterialRequestBatch({
        ...base,
        serviceIds: props.serviceIds,
      });
      setSubmitting(false);
      if (result.success && result.requestIds?.length) {
        const first = result.requestIds[0];
        const batch = result.requestIds.length;
        router.push(
          `/request-info/complete?requestId=${first}${batch > 1 ? `&batch=${batch}` : ""}`
        );
        return;
      }
      setError(result.error ?? "送信に失敗しました");
      return;
    }
    if (!serviceId) {
      setSubmitting(false);
      setError("サービスを選択してください");
      return;
    }
    const result = await submitMaterialRequest({ ...base, serviceId });
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
        <Link href={isBatchMode ? "/request-info/list" : `/services/${serviceId}`}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {isBatchMode ? "サービスのお気に入りに戻る" : "サービスに戻る"}
        </Link>
      </Button>

      <div>
        <h1 className="text-3xl font-bold mb-2">資料請求</h1>
        <p className="text-muted-foreground">
          {isBatchMode && services
            ? `${services.length}件のサービスに同じ送付先で資料を請求します`
            : service
              ? `「${service.title}」の資料を請求します`
              : ""}
        </p>
        {isBatchMode && services && services.length > 0 && (
          <ul className="mt-3 list-disc list-inside text-sm text-muted-foreground space-y-1">
            {services.map((s) => (
              <li key={s.id}>{s.title}</li>
            ))}
          </ul>
        )}
      </div>

      <Card className="lg:max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            資料請求フォーム
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {/* メールアドレス・名前・塾名/学校名・電話番号を最初に表示 */}
            <div className="space-y-4 p-4 border rounded-lg">
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
                <label className="block text-sm font-medium mb-2">塾名・学校名（任意）</label>
                <Input
                  value={deliveryOrganization}
                  onChange={(e) => setDeliveryOrganization(e.target.value)}
                  placeholder="○○中学校、○○塾など"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium mb-2">電話番号</label>
                <Input
                  value={deliveryPhone}
                  onChange={(e) => setDeliveryPhone(e.target.value)}
                  placeholder="090-1234-5678"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium mb-2">ご要望・ご質問（任意）</label>
              <Textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="ご質問などがあればご記入ください"
              />
            </div>

            {error && (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive font-medium">{error}</p>
              </div>
            )}

            <div className="form-actions">
              <Button
                type="submit"
                className="w-full sm:w-auto sm:min-w-[240px]"
                size="lg"
                disabled={submitting}
              >
                {submitting
                  ? "送信中…"
                  : isBatchMode && services
                    ? `${services.length}件に資料請求を送信`
                    : "資料請求を送信"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
