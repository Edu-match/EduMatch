"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { Badge } from "@/components/ui/badge";
import {
  User,
  Building2,
  GraduationCap,
  ArrowLeft,
  ArrowRight,
  Check,
  MapPin,
  ImageIcon,
  Loader2,
} from "lucide-react";
import { updateProfile } from "@/app/_actions";
import { uploadImage } from "@/app/_actions";
import {
  ORGANIZATION_TYPE_OPTIONS,
  formatOrganizationTypeDisplay,
  AGE_OPTIONS,
} from "@/lib/organization-types";

export type InitialProfile = {
  name: string;
  legal_name?: string | null;
  age?: string | null;
  email: string;
  avatar_url?: string | null;
  phone: string | null;
  organization?: string | null;
  organization_type?: string | null;
  organization_type_other?: string | null;
  bio?: string | null;
  website?: string | null;
  notification_email_2?: string | null;
  notification_email_3?: string | null;
  role?: string;
  is_corporate_profile?: boolean;
  registration_kind?: "general" | "service_business" | null;
  interests?: string[];
  interest_other?: string | null;
};

const steps = [
  { id: 1, title: "アカウント", icon: User },
  { id: 2, title: "所属情報", icon: Building2 },
  { id: 3, title: "連絡先（資料請求の通知先）", icon: MapPin },
  { id: 4, title: "関心・スキル", icon: GraduationCap },
  { id: 5, title: "確認", icon: Check },
];

const interests = [
  "学習管理", "コミュニケーション", "評価・分析", "協働学習",
  "プログラミング教育", "オンライン授業", "AI活用", "データ分析",
  "学校DX", "働き方改革", "その他",
];

const INTEREST_OTHER_MAX = 100;

const roles = [
  { value: "teacher", label: "教員" },
  { value: "admin", label: "管理職" },
  { value: "ict-staff", label: "ICT担当" },
  { value: "curriculum", label: "カリキュラム担当" },
  { value: "other", label: "その他" },
];

type Props = {
  initialProfile: InitialProfile | null;
  isFirstTime?: boolean;
  /** 保存後のリダイレクト先（Googleログイン後など） */
  nextUrl?: string;
};

export function ProfileRegisterForm({
  initialProfile,
  isFirstTime,
  nextUrl,
}: Props) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [legalName, setLegalName] = useState(initialProfile?.legal_name ?? "");
  const [age, setAge] = useState(initialProfile?.age ?? "");
  const [name, setName] = useState(initialProfile?.name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(initialProfile?.avatar_url ?? "");
  const [email] = useState(initialProfile?.email ?? "");
  const [phone, setPhone] = useState(initialProfile?.phone ?? "");
  const [organization, setOrganization] = useState(initialProfile?.organization ?? "");
  const [schoolType, setSchoolType] = useState(initialProfile?.organization_type ?? "");
  const [organizationTypeOther, setOrganizationTypeOther] = useState(
    initialProfile?.organization_type_other ?? ""
  );
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>(
    initialProfile?.interests ?? []
  );
  const [interestOther, setInterestOther] = useState(
    initialProfile?.interest_other ?? ""
  );
  const [bio, setBio] = useState(initialProfile?.bio ?? "");
  const [website, setWebsite] = useState(initialProfile?.website ?? "");
  const [notificationEmail2, setNotificationEmail2] = useState(initialProfile?.notification_email_2 ?? "");
  const [notificationEmail3, setNotificationEmail3] = useState(initialProfile?.notification_email_3 ?? "");
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  const isProvider =
    initialProfile?.is_corporate_profile === true ||
    initialProfile?.registration_kind === "service_business";

  const toggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter((i) => i !== interest));
    } else {
      setSelectedInterests([...selectedInterests, interest]);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">プロフィール画像（アイコン）</label>
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-20 h-20 rounded-full bg-muted border-2 flex items-center justify-center overflow-hidden">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="プロフィール"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="h-10 w-10 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <input
                    ref={avatarFileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setAvatarUploading(true);
                      const formData = new FormData();
                      formData.append("file", file);
                      const result = await uploadImage(formData);
                      setAvatarUploading(false);
                      if (result.success && result.url) setAvatarUrl(result.url);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={avatarUploading}
                    onClick={() => avatarFileInputRef.current?.click()}
                  >
                    {avatarUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <ImageIcon className="h-4 w-4 mr-2" />
                    )}
                    画像をアップロード
                  </Button>
                  <Input
                    type="url"
                    placeholder="または画像のURLを入力"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                名前 <span className="text-red-500">*</span>
              </label>
              <Input value={legalName} onChange={(e) => setLegalName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">年齢（年代）</label>
              <Select value={age} onValueChange={setAge}>
                <SelectTrigger>
                  <SelectValue placeholder="選択してください" />
                </SelectTrigger>
                <SelectContent>
                  {AGE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                表示名（ニックネーム） <span className="text-red-500">*</span>
              </label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                メールアドレス <span className="text-red-500">*</span>
              </label>
              <Input type="email" value={email} readOnly className="bg-muted" />
              <p className="text-xs text-muted-foreground">
                メールアドレスはログインに使用しているため変更できません
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">電話番号（任意）</label>
              <Input
                placeholder="090-1234-5678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                所属 <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder={isProvider ? "塾名・学校名など" : "学校名、学年、保護者など"}
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                所属の種類 <span className="text-red-500">*</span>
              </label>
              <Select value={schoolType} onValueChange={setSchoolType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORGANIZATION_TYPE_OPTIONS.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {schoolType === "other" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">その他の内容（任意）</label>
                <Input
                  placeholder="例: フリーランス、NPO、学習塾など"
                  value={organizationTypeOther}
                  onChange={(e) => setOrganizationTypeOther(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  「その他」を選んだ場合のみ、補足を入力できます。
                </p>
              </div>
            )}
            {isProvider && (
              <div className="space-y-2">
                <label className="text-sm font-medium">役職・職種</label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">所在地</label>
              <Input
                placeholder="東京都"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>
        );

      case 3:
        if (!isProvider) {
          // 一般ユーザーの場合はこのステップをスキップして次へ
          setCurrentStep(4);
          return null;
        }
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">
              サービス提供者として登録している場合、資料請求があった際の通知先メールアドレスを追加できます。
            </p>
            <p className="text-sm font-medium mb-2">資料請求の通知先（任意）</p>
            <p className="text-xs text-muted-foreground mb-3">
              サービス提供者として登録している場合、資料請求があった際に通知を送るメールアドレスを追加できます。最大3件まで送信されます（1件目はログイン用メールアドレス）。
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">通知用メールアドレス2</label>
              <Input
                type="email"
                placeholder="例: info@example.com"
                value={notificationEmail2}
                onChange={(e) => setNotificationEmail2(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">通知用メールアドレス3</label>
              <Input
                type="email"
                placeholder="例: sales@example.com"
                value={notificationEmail3}
                onChange={(e) => setNotificationEmail3(e.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              className="w-full text-muted-foreground mt-2"
              onClick={() => setCurrentStep(4)}
            >
              スキップする（後で設定できます）
            </Button>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                関心のあるカテゴリ（複数選択可）
              </label>
              <div className="flex flex-wrap gap-2">
                {interests.map((interest) => (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleInterest(interest)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                      selectedInterests.includes(interest)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80"
                    }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
              {selectedInterests.includes("その他") && (
                <div className="mt-2 space-y-1">
                  <Input
                    placeholder="関心分野を自由に記入してください（例：特別支援教育、生涯学習など）"
                    value={interestOther}
                    maxLength={INTEREST_OTHER_MAX}
                    onChange={(e) => setInterestOther(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {interestOther.length}/{INTEREST_OTHER_MAX}文字
                  </p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                自己紹介・活動内容（任意）
              </label>
              <Textarea
                placeholder="EdTechに関する取り組みや、関心事について教えてください。投稿者として表示されるプロフィール文です。"
                rows={5}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                公式サイト・SNS（任意）
              </label>
              <Input
                type="url"
                placeholder="https://example.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="p-4 rounded-lg bg-muted/50">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <User className="h-4 w-4" />
                アカウント
              </h3>
              <div className="flex items-center gap-4 mb-3">
                <div className="w-14 h-14 rounded-full bg-muted border-2 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="h-7 w-7 text-muted-foreground" />
                  )}
                </div>
                <div className="space-y-2 text-sm flex-1 min-w-0">
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground shrink-0">名前</span>
                    <span className="text-right break-all">{legalName || "未入力"}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground shrink-0">年齢</span>
                    <span>{AGE_OPTIONS.find(o => o.value === age)?.label || "未入力"}</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">表示名（ニックネーム）</span>
                      <span>{name || "未入力"}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">メールアドレス</span>
                      <span className="break-all">{email || "未入力"}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">電話番号</span>
                      <span>{phone || "未入力"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted/50">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                所属情報
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">所属</span>
                  <span>{organization || "未入力"}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground shrink-0">所属の種類</span>
                  <span className="text-right break-words">
                    {formatOrganizationTypeDisplay(schoolType, organizationTypeOther) ||
                      "未入力"}
                  </span>
                </div>
                {isProvider && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">役職・職種</span>
                    <span>
                      {roles.find((r) => r.value === role)?.label || "未入力"}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">所在地</span>
                  <span>{location || "未入力"}</span>
                </div>
              </div>
            </div>

            {isProvider && (
              <div className="p-4 rounded-lg bg-muted/50">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  連絡先（資料請求の通知先）
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">電話番号</span>
                    <span>{phone || "未入力"}</span>
                  </div>
                  {(notificationEmail2 || notificationEmail3) && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">通知用メール2</span>
                        <span>{notificationEmail2 || "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">通知用メール3</span>
                        <span>{notificationEmail3 || "—"}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="p-4 rounded-lg bg-muted/50">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                関心・スキル
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground block mb-2">
                    関心カテゴリ
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {selectedInterests.length > 0 ? (
                      selectedInterests.map((interest) => (
                        <Badge key={interest} variant="secondary">
                          {interest}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground">未選択</span>
                    )}
                  </div>
                  {selectedInterests.includes("その他") && interestOther && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      その他の内容: {interestOther}
                    </p>
                  )}
                </div>
                {bio && (
                  <div>
                    <span className="text-muted-foreground block mb-1">
                      自己紹介
                    </span>
                    <p className="whitespace-pre-wrap">{bio}</p>
                  </div>
                )}
                {website && (
                  <div>
                    <span className="text-muted-foreground block mb-1">
                      公式サイト・SNS
                    </span>
                    <a href={website} target="_blank" rel="noopener noreferrer" className="text-primary underline break-all">{website}</a>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const handleNext = () => {
    setValidationError(null);
    if (currentStep === 1) {
      if (!legalName.trim()) {
        setValidationError("名前を入力してください。");
        return;
      }
      if (!name.trim()) {
        setValidationError("表示名を入力してください。");
        return;
      }
    } else if (currentStep === 2) {
      if (!organization.trim()) {
        setValidationError("所属を入力してください。");
        return;
      }
      if (!schoolType) {
        setValidationError("所属の種類を選択してください。");
        return;
      }
    }
    
    // 一般ユーザーの場合、ステップ2の次はステップ4へ
    if (currentStep === 2 && !isProvider) {
      setCurrentStep(4);
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    setValidationError(null);
    // 一般ユーザーの場合、ステップ4の戻る先はステップ2
    if (currentStep === 4 && !isProvider) {
      setCurrentStep(2);
    } else {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSave = async () => {
    setValidationError(null);
    if (!legalName.trim()) {
      setValidationError("名前を入力してください。");
      return;
    }
    if (!name.trim()) {
      setValidationError("表示名を入力してください。");
      return;
    }
    if (!organization.trim()) {
      setValidationError("所属を入力してください。");
      return;
    }
    if (!schoolType) {
      setValidationError("所属の種類を選択してください。");
      return;
    }
    setSaving(true);
    const { success } = await updateProfile({
      name: name || undefined,
      legal_name: legalName.trim(),
      age: age || null,
      avatar_url: avatarUrl.trim() || null,
      phone: phone || null,
      organization: organization?.trim() || null,
      organization_type: schoolType || null,
      organization_type_other:
        schoolType === "other" ? organizationTypeOther.trim() || null : null,
      bio: bio || null,
      website: website || null,
      notification_email_2: isProvider ? (notificationEmail2.trim() || null) : null,
      notification_email_3: isProvider ? (notificationEmail3.trim() || null) : null,
      interests: selectedInterests,
      interest_other: selectedInterests.includes("その他")
        ? interestOther.trim() || null
        : null,
      completeInitialSetup: true,
    });
    setSaving(false);
    if (success) router.push(nextUrl ?? "/dashboard");
  };

  return (
    <div className="container py-8">
      <Button variant="ghost" asChild className="mb-4">
        <Link href="/mypage">
          <ArrowLeft className="h-4 w-4 mr-2" />
          マイページに戻る
        </Link>
      </Button>

      <div className="max-w-2xl mx-auto">
        {isFirstTime && (
          <div className="mb-6 p-4 rounded-lg bg-primary/10 border border-primary/20 text-center">
            <p className="font-medium text-primary">
              {isProvider
                ? "事業者アカウントとして登録済みです。事業者名・所属・資料請求の通知先まで入力してください。"
                : "一般利用として登録済みです。表示名・所属・関心分野などを入力してください。"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              表示名や所属などはあとから変更できます。一般利用と事業者の登録種別を切り替えることはできません。
            </p>
          </div>
        )}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">アカウント設定</h1>
          <p className="text-muted-foreground">
            {isProvider
              ? "掲載・投稿に使う事業者情報と、資料請求の通知先を設定します"
              : "サイト上の表示名・所属・関心分野などを設定します"}
          </p>
        </div>

        <div className="flex items-center justify-center mb-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.id} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full ${
                    currentStep >= step.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-12 h-1 ${
                      currentStep > step.id ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{steps[currentStep - 1].title}</CardTitle>
          </CardHeader>
          <CardContent>
            {renderStep()}

            {validationError && (
              <div className="mt-4 p-3 rounded-md bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive font-medium" role="alert">
                  {validationError}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between gap-3 mt-8">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 1}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                戻る
              </Button>
              {currentStep < 5 ? (
                <Button type="button" onClick={handleNext}>
                  次へ
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={saving}
                  onClick={handleSave}
                >
                  {saving ? "保存中…" : "保存して完了"}
                  <Check className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
