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
import { Mail, MessageCircle, Clock, HelpCircle, Loader2 } from "lucide-react";
import { OpenAiChatButton } from "@/components/ui/open-ai-chat-button";
import { toast } from "sonner";
import { submitContact } from "@/app/_actions";
import { useTranslations } from "next-intl";

export default function ContactPage() {
  const t = useTranslations("contact");
  const categories = [
    { value: "general", label: t("catGeneral") },
    { value: "billing", label: t("catBilling") },
    { value: "listing", label: t("catListing") },
    { value: "partnership", label: t("catPartnership") },
    { value: "other", label: t("catOther") },
  ];
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(t("errName"));
      return;
    }
    if (!email.trim()) {
      toast.error(t("errEmail"));
      return;
    }
    if (!category) {
      toast.error(t("errCategory"));
      return;
    }
    if (!message.trim()) {
      toast.error(t("errMessage"));
      return;
    }

    setSubmitting(true);
    const categoryLabel = categories.find((c) => c.value === category)?.label ?? category;
    const result = await submitContact({
      name: name.trim(),
      email: email.trim(),
      category: categoryLabel,
      message: message.trim(),
    });
    setSubmitting(false);

    if (result.success && result.inquiryId) {
      const params = new URLSearchParams({
        email: email.trim(),
        category: categoryLabel,
        inquiryId: result.inquiryId,
      });
      router.push(`/contact/complete?${params.toString()}`);
      return;
    }
    toast.error(result.error ?? t("errSend"));
  };

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t("title")}</h1>
        <p className="text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* メインフォーム */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("formTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {t("name")} <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder={t("namePlaceholder")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {t("email")} <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("categoryLabel")} <span className="text-red-500">*</span>
              </label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder={t("selectPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t("messageLabel")} <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder={t("messagePlaceholder")}
                rows={8}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">
                {t("requiredNote")}
              </p>
            </div>

            <div className="form-actions">
              <Button
                type="submit"
                className="w-full sm:w-auto sm:min-w-[200px]"
                size="lg"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("submitting")}
                  </>
                ) : (
                  t("submit")
                )}
              </Button>
            </div>
            </form>
          </CardContent>
        </Card>

        {/* サイドバー */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {t("hoursTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                {t("hoursBody")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("hoursNote")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Mail className="h-5 w-5" />
                {t("emailTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-primary">info@edu-match.com</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                {t("aiTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {t("aiBody")}
              </p>
              <OpenAiChatButton variant="outline" className="w-full">
                {t("aiButton")}
              </OpenAiChatButton>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                {t("faqTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {t("faqBody")}
              </p>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/faq">{t("faqButton")}</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
