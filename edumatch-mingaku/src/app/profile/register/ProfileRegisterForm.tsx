"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TUTORIAL_SUPPRESS_ON_RETURN_KEY } from "@/components/tutorial/tutorial-steps";
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
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  User,
  Building2,
  Handshake,
  GraduationCap,
  ArrowLeft,
  ArrowRight,
  Check,
  MapPin,
  ImageIcon,
  Loader2,
  Sparkles,
} from "lucide-react";
import { updateProfile } from "@/app/_actions";
import { uploadImage } from "@/app/_actions";
import { PersonaCreator } from "@/components/persona/persona-creator";
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
  job_title?: string | null;
  position?: string | null;
  bio?: string | null;
  website?: string | null;
  notification_email_2?: string | null;
  notification_email_3?: string | null;
  address?: string | null;
  role?: string;
  is_corporate_profile?: boolean;
  registration_kind?: "general" | "service_business" | null;
  interests?: string[];
  interest_other?: string | null;
  talent_matching_enabled?: boolean;
  talent_matching_description?: string | null;
  talent_badges?: string[];
  talent_hourly_rate?: string | null;
};

const steps = [
  { id: 1, title: "アカウント・所属", icon: User },
  { id: 2, title: "アバターを設定", icon: Sparkles },
  { id: 3, title: "連絡先（資料請求の通知先）", icon: MapPin },
  { id: 4, title: "関心・スキル", icon: GraduationCap },
  { id: 5, title: "人材マッチング", icon: Handshake },
  { id: 6, title: "確認", icon: Check },
];

const TALENT_BADGE_OPTIONS = [
  { value: "lecture", label: "講演依頼", desc: "イベント・セミナーでの講演" },
  { value: "teaching", label: "講師依頼", desc: "授業・講座での講師活動" },
  { value: "workshop", label: "研修・ワークショップ", desc: "チーム向け研修・ハンズオン" },
  { value: "advisor", label: "顧問・アドバイザー", desc: "継続的なアドバイス・監修" },
  { value: "consulting", label: "コンサルティング", desc: "課題解決・導入支援" },
  { value: "writing", label: "執筆・寄稿", desc: "記事・書籍・教材の執筆" },
  { value: "work", label: "仕事依頼（その他）", desc: "上記以外のお仕事全般" },
] as const;

const interests = [
  "学習管理", "コミュニケーション", "評価・分析", "協働学習",
  "プログラミング教育", "オンライン授業", "AI活用", "データ分析",
  "学校DX", "働き方改革", "その他",
];

const INTEREST_OTHER_MAX = 100;

const AVATAR_TEMPLATES = [
  "/avatars/templates/1.svg",
  "/avatars/templates/2.svg",
  "/avatars/templates/3.svg",
  "/avatars/templates/4.svg",
] as const;

const roles = [
  { value: "teacher", label: "教員" },
  { value: "admin", label: "管理職" },
  { value: "ict-staff", label: "ICT担当" },
  { value: "curriculum", label: "カリキュラム担当" },
  { value: "other", label: "その他" },
];
const ROLE_VALUES = new Set(roles.map((r) => r.value));

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
  const initialJobTitle = initialProfile?.job_title ?? "";
  const [role, setRole] = useState(
    initialJobTitle && ROLE_VALUES.has(initialJobTitle) ? initialJobTitle : initialJobTitle ? "other" : ""
  );
  const [roleOther, setRoleOther] = useState(
    initialJobTitle && !ROLE_VALUES.has(initialJobTitle) ? initialJobTitle : ""
  );
  const [position, setPosition] = useState(initialProfile?.position ?? "");
  const [address, setAddress] = useState(initialProfile?.address ?? "");
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
  const [talentMatchingEnabled, setTalentMatchingEnabled] = useState(
    initialProfile?.talent_matching_enabled ?? false
  );
  const [talentMatchingDescription, setTalentMatchingDescription] = useState(
    initialProfile?.talent_matching_description ?? ""
  );
  const [talentBadges, setTalentBadges] = useState<string[]>(
    initialProfile?.talent_badges ?? []
  );
  const [talentHourlyRate, setTalentHourlyRate] = useState(
    initialProfile?.talent_hourly_rate ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarPreviewOpen, setAvatarPreviewOpen] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  // ステップが変わったら即座にページ最上部へスクロール（スムーズアニメなし）。
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    document.documentElement.scrollTop = 0;
  }, [currentStep]);

  const isProvider =
    initialProfile?.is_corporate_profile === true ||
    initialProfile?.registration_kind === "service_business";

  // 一般ユーザーはステップ3（資料請求の通知先）を利用しないため、
  // ステッパー表示・タイトル参照・進捗計算はこの配列を基準にする。
  const visibleSteps = isProvider ? steps : steps.filter((s) => s.id !== 3);
  const currentStepMeta =
    steps.find((s) => s.id === currentStep) ?? steps[steps.length - 1];

  const toggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter((i) => i !== interest));
    } else {
      setSelectedInterests([...selectedInterests, interest]);
    }
  };

  const toggleTalentBadge = (badge: string) => {
    setTalentBadges((prev) =>
      prev.includes(badge) ? prev.filter((item) => item !== badge) : [...prev, badge]
    );
  };

  // アバターのテンプレート選択（主）＋画像アップロード（従）ブロック。
  // テンプレートから選ぶのが基本。画像アップロードは小さな副次オプションに降格。
  const isTemplateSelected = AVATAR_TEMPLATES.some((url) => url === avatarUrl);
  const isUploadedSelected = !!avatarUrl && !isTemplateSelected;
  const renderAvatarUploader = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {avatarUrl ? (
          <button
            type="button"
            onClick={() => setAvatarPreviewOpen(true)}
            aria-label="アバターを拡大表示"
            className="group relative flex-shrink-0 w-16 h-16 rounded-full bg-muted border-2 flex items-center justify-center overflow-hidden transition hover:ring-2 hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-zoom-in"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarUrl}
              alt="プロフィール"
              className="w-full h-full object-cover"
            />
          </button>
        ) : (
          <div className="flex-shrink-0 w-16 h-16 rounded-full bg-muted border-2 flex items-center justify-center overflow-hidden">
            <User className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        <div className="text-sm">
          <p className="font-medium">
            {avatarUrl ? "アバターを選択済み" : "アバターが未設定です"}
          </p>
          {avatarUrl && (
            <p className="text-xs text-muted-foreground mt-0.5">クリックで拡大</p>
          )}
          <p className="text-red-500 text-xs mt-0.5">※アバターの設定は必須です</p>
        </div>
      </div>

      <Dialog open={avatarPreviewOpen} onOpenChange={setAvatarPreviewOpen}>
        <DialogContent className="w-auto max-w-[90vw] p-6">
          <DialogTitle className="sr-only">アバターのプレビュー</DialogTitle>
          {avatarUrl && (
            <div className="flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatarUrl}
                alt="アバターの拡大表示"
                className="h-auto w-[min(320px,80vw)] rounded-lg object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* テンプレート選択（おすすめ・手軽） */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          テンプレートから選ぶ <span className="text-red-500">*</span>
          <span className="ml-1 text-xs font-normal text-muted-foreground">（ワンタップで設定・おすすめ）</span>
        </label>
        <div className="flex flex-wrap gap-2.5">
          {AVATAR_TEMPLATES.map((url) => (
            <button
              key={url}
              type="button"
              onClick={() => setAvatarUrl(url)}
              className={`h-14 w-14 rounded-full border-2 overflow-hidden transition-all ${
                avatarUrl === url
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-muted hover:border-primary/50"
              }`}
              aria-label="テンプレート画像を選択"
              aria-pressed={avatarUrl === url}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      </div>

      {/* 画像アップロード（副・でも分かりやすいボタンに） */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-muted-foreground">または画像をアップロード</label>
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
        <button
          type="button"
          disabled={avatarUploading}
          onClick={() => avatarFileInputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border px-4 py-3 text-sm font-medium text-foreground transition hover:border-primary/50 hover:bg-primary/[0.03] disabled:opacity-60 sm:w-auto"
        >
          {avatarUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImageIcon className="h-4 w-4" />
          )}
          {isUploadedSelected ? "画像を変更（選択中）" : "画像をアップロード"}
        </button>
        <p className="text-xs text-muted-foreground">JPG / PNG / GIF / WebP。スマホで撮った写真もそのまま使えます。</p>
      </div>
    </div>
  );

  // AIアバター生成ブロック（アバターステップで表示）。
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {isProvider ? "代表者名" : "名前"} <span className="text-red-500">*</span>
              </label>
              <Input value={legalName} onChange={(e) => setLegalName(e.target.value)} />
            </div>
            {!isProvider && (
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
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {isProvider ? "ご登録いただく方のお名前" : "表示名（ニックネーム）"}{" "}
                <span className="text-red-500">*</span>
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
            {isProvider && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  事業者・団体のTEL <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="03-1234-5678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            )}

            {/* 所属情報（旧ステップ2をアカウントページに統合） */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {isProvider ? "事業者・団体名" : "所属"} <span className="text-red-500">*</span>
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
                <Select
                  value={role}
                  onValueChange={(value) => {
                    setRole(value);
                    if (value !== "other") setRoleOther("");
                  }}
                >
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
                {role === "other" && (
                  <Input
                    placeholder="役職・職種を入力してください"
                    value={roleOther}
                    onChange={(e) => setRoleOther(e.target.value)}
                  />
                )}
              </div>
            )}
            {/* 役職・肩書（全ユーザー対象） */}
            <div className="space-y-2">
              <label className="text-sm font-medium">役職・肩書（任意）</label>
              <Input
                placeholder="例：教員、教頭、校長、職員、保護者など"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
              />
            </div>
            {isProvider && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    事業者・団体の所在地 <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="東京都千代田区..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
                <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-xs leading-relaxed text-muted-foreground">
                  新規開業予定の方は、現時点ではご登録いただく方の情報をご記入ください。
                </div>
              </>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              アバターを設定します。テンプレートから選ぶのがおすすめです（画像のアップロードも可能）。
            </p>
            {renderAvatarUploader()}
            {initialProfile?.role === "ADMIN" && (
              <>
                <div className="flex items-center gap-2">
                  <span className="h-px flex-1 bg-border" />
                  <span className="text-xs font-semibold text-muted-foreground">または AIで生成（管理者）</span>
                  <span className="h-px flex-1 bg-border" />
                </div>
                <PersonaCreator
                  defaults={{
                    name: (legalName || name || "").trim(),
                    bio: bio || undefined,
                    organization: organization || undefined,
                    role: roleOther || role || undefined,
                    interests: selectedInterests,
                  }}
                  currentAvatarUrl={avatarUrl}
                  onGenerated={(r) => { if (r.avatarUrl) setAvatarUrl(r.avatarUrl); }}
                />
              </>
            )}
          </div>
        );

      case 3:
        // このステップは事業者専用。一般ユーザーの遷移は handleNext/handleBack で
        // ステップ2⇄4を直接処理するため、ここに到達した場合は何も描画しない。
        if (!isProvider) {
          return null;
        }
        return (
          <div className="space-y-4">
            <p className="text-sm font-semibold mb-2">資料請求の通知先（任意）</p>
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
                    className={`px-3 py-2 min-h-[40px] rounded-full text-sm transition-colors ${
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
                自己紹介（任意）
              </label>
              <Textarea
                placeholder="あなたの教育への想いや関心事を自由に書いてください。投稿者として表示されるプロフィール文です。"
                rows={5}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>
            {isProvider && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  公式サイトURL <span className="text-red-500">*</span>
                </label>
                <Input
                  type="url"
                  placeholder="https://example.com"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>
            )}

          </div>
        );

      case 5:
        return (
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-sm leading-relaxed text-muted-foreground">
                人材マッチングは、講演・講師・研修・顧問などの依頼を受けたい方と、依頼したい方をつなぐ仕組みです。登録すると、あなたのプロフィールが人材マッチング一覧に掲載され、依頼を受け取れるようになります。
              </p>
              <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
                ※登録は可能ですが、マッチング機能は現在準備中です。公開開始までお待ちください。
              </div>
            </div>

            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-start gap-3">
                <input
                  id="talent-matching-enabled"
                  type="checkbox"
                  checked={talentMatchingEnabled}
                  onChange={(e) => setTalentMatchingEnabled(e.target.checked)}
                  className="mt-1 h-5 w-5 cursor-pointer"
                />
                <div className="space-y-1">
                  <label htmlFor="talent-matching-enabled" className="font-medium cursor-pointer">
                    人材マッチングに登録する
                  </label>
                  <p className="text-sm text-muted-foreground">
                    チェックすると、機能公開時にあなたのプロフィールが人材マッチング一覧に表示されます。
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium">受け付ける依頼種別（複数選択可）</label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {TALENT_BADGE_OPTIONS.map((option) => {
                    const selected = talentBadges.includes(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => toggleTalentBadge(option.value)}
                        className={`rounded-lg border p-3 text-left transition-colors ${
                          selected ? "border-primary bg-primary/10" : "hover:bg-muted"
                        }`}
                      >
                        <span className="block text-sm font-medium">{option.label}</span>
                        <span className="block text-xs text-muted-foreground">{option.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">自己PR・対応できる依頼内容（任意）</label>
                <Textarea
                  placeholder="例：教育ICT分野の講演・研修を承ります。プログラミング教育の導入支援や教員向けワークショップも可能です。"
                  rows={4}
                  value={talentMatchingDescription}
                  onChange={(e) => setTalentMatchingDescription(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">ギャラ・料金目安（任意）</label>
                <Input
                  placeholder="例：講演 1時間 5万円〜、応相談 など"
                  value={talentHourlyRate}
                  onChange={(e) => setTalentHourlyRate(e.target.value)}
                />
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="p-4 rounded-lg bg-muted/50">
              <h3 className="text-base font-semibold tracking-[-0.01em] mb-3 flex items-center gap-2">
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
                  {!isProvider && (
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground shrink-0">年齢</span>
                      <span>{AGE_OPTIONS.find(o => o.value === age)?.label || "未入力"}</span>
                    </div>
                  )}
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">表示名（ニックネーム）</span>
                      <span>{name || "未入力"}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">メールアドレス</span>
                      <span className="break-all">{email || "未入力"}</span>
                    </div>
                    {isProvider && (
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">事業者・団体のTEL</span>
                        <span>{phone || "未入力"}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted/50">
              <h3 className="text-base font-semibold tracking-[-0.01em] mb-3 flex items-center gap-2">
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
                      {role === "other"
                        ? roleOther || "未入力"
                        : roles.find((r) => r.value === role)?.label || "未入力"}
                    </span>
                  </div>
                )}
                {isProvider && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">事業者・団体の所在地</span>
                    <span>{address || "未入力"}</span>
                  </div>
                )}
              </div>
            </div>

            {isProvider && (
              <div className="p-4 rounded-lg bg-muted/50">
                <h3 className="text-base font-semibold tracking-[-0.01em] mb-3 flex items-center gap-2">
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
              <h3 className="text-base font-semibold tracking-[-0.01em] mb-3 flex items-center gap-2">
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
                {isProvider && (
                  <div>
                    <span className="text-muted-foreground block mb-1">公式サイトURL</span>
                    {website ? (
                      <a
                        href={website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline break-all"
                      >
                        {website}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">未入力</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted/50">
              <h3 className="text-base font-semibold tracking-[-0.01em] mb-3 flex items-center gap-2">
                <Handshake className="h-4 w-4" />
                人材マッチング
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">登録</span>
                  <span className={talentMatchingEnabled ? "text-primary font-medium" : ""}>
                    {talentMatchingEnabled ? "登録済み" : "登録なし"}
                  </span>
                </div>
                {talentMatchingEnabled && (
                  <>
                    <div>
                      <span className="text-muted-foreground block mb-2">依頼種別</span>
                      <div className="flex flex-wrap gap-1">
                        {talentBadges.length > 0 ? (
                          talentBadges.map((badge) => (
                            <Badge key={badge} variant="secondary">
                              {TALENT_BADGE_OPTIONS.find((option) => option.value === badge)?.label ?? badge}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground">未選択</span>
                        )}
                      </div>
                    </div>
                    {talentMatchingDescription.trim() && (
                      <div>
                        <span className="text-muted-foreground block mb-1">自己PR</span>
                        <p className="whitespace-pre-wrap">{talentMatchingDescription.trim()}</p>
                      </div>
                    )}
                    {talentHourlyRate.trim() && (
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground shrink-0">ギャラ・料金目安</span>
                        <span className="text-right break-words">{talentHourlyRate.trim()}</span>
                      </div>
                    )}
                  </>
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
      if (isProvider && !phone.trim()) {
        setValidationError("事業者・団体のTELを入力してください。");
        return;
      }
      // 所属（旧ステップ2をアカウントページに統合）
      if (!organization.trim()) {
        setValidationError("所属を入力してください。");
        return;
      }
      if (!schoolType) {
        setValidationError("所属の種類を選択してください。");
        return;
      }
      if (isProvider && !address.trim()) {
        setValidationError("事業者・団体の所在地を入力してください。");
        return;
      }
      // アバターは次の「アバターを設定」ステップで必須。
    } else if (currentStep === 2 && !avatarUrl.trim()) {
      setValidationError("アバターを設定してください（テンプレートから選ぶか、画像をアップロードしてください）。");
      return;
    } else if (currentStep === 4 && isProvider && !website.trim()) {
      setValidationError("公式サイトURLを入力してください。");
      return;
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
    if (isProvider && !phone.trim()) {
      setValidationError("事業者・団体のTELを入力してください。");
      return;
    }
    if (isProvider && !address.trim()) {
      setValidationError("事業者・団体の所在地を入力してください。");
      return;
    }
    if (isProvider && !website.trim()) {
      setValidationError("公式サイトURLを入力してください。");
      return;
    }
    if (!avatarUrl.trim()) {
      setValidationError("アバターを設定してください（「アバターを設定」ステップで、テンプレートから選ぶか画像をアップロードできます）。");
      return;
    }
    setSaving(true);
    const { success, error } = await updateProfile({
      name: name || undefined,
      legal_name: legalName.trim(),
      age: isProvider ? null : age || null,
      avatar_url: avatarUrl.trim() || null,
      phone: phone || null,
      organization: organization?.trim() || null,
      organization_type: schoolType || null,
      organization_type_other:
        schoolType === "other" ? organizationTypeOther.trim() || null : null,
      job_title: isProvider
        ? role === "other"
          ? roleOther.trim() || null
          : role || null
        : null,
      position: position.trim() || null,
      bio: bio || null,
      website: website || null,
      address: isProvider ? address.trim() || null : null,
      notification_email_2: isProvider ? (notificationEmail2.trim() || null) : null,
      notification_email_3: isProvider ? (notificationEmail3.trim() || null) : null,
      interests: selectedInterests,
      interest_other: selectedInterests.includes("その他")
        ? interestOther.trim() || null
        : null,
      talent_matching_enabled: talentMatchingEnabled,
      talent_matching_description: talentMatchingEnabled
        ? talentMatchingDescription.trim() || null
        : null,
      talent_badges: talentMatchingEnabled ? talentBadges : [],
      talent_hourly_rate: talentMatchingEnabled ? talentHourlyRate.trim() || null : null,
      completeInitialSetup: true,
    });
    setSaving(false);
    if (!success) {
      setValidationError(
        error ?? "保存に失敗しました。時間をおいて再度お試しください。"
      );
      return;
    }
    if (success) {
      // 元いたページ（申込ページ等）から来た場合は最優先でそこへ戻す。その際チュートリアルは出さない。
      if (nextUrl) {
        try { window.sessionStorage.setItem(TUTORIAL_SUPPRESS_ON_RETURN_KEY, "1"); } catch { /* noop */ }
        router.push(nextUrl);
        return;
      }
      if (isFirstTime) {
        router.push("/?tutorial=start");
        return;
      }
      router.push("/dashboard");
    }
  };

  return (
    <div className="container py-6 sm:py-8">
      <Button variant="ghost" asChild className="mb-4 -ml-2">
        <Link href="/mypage">
          <ArrowLeft className="h-4 w-4 mr-2" />
          マイページに戻る
        </Link>
      </Button>

      <div className="max-w-2xl mx-auto">
        {isFirstTime && (
          <div className="mb-6 p-4 rounded-lg bg-primary/10 border border-primary/20 text-center">
            <p className="font-medium text-primary text-sm sm:text-base">
              {isProvider
                ? "事業者アカウントとして登録済みです。事業者名・所属・資料請求の通知先まで入力してください。"
                : "一般利用として登録済みです。表示名・所属・関心分野などを入力してください。"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              表示名や所属などはあとから変更できます。一般利用と事業者の登録種別を切り替えることはできません。
            </p>
          </div>
        )}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">アカウント設定</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {isProvider
              ? "掲載・投稿に使う事業者情報と、資料請求の通知先を設定します"
              : "サイト上の表示名・所属・関心分野などを設定します"}
          </p>
        </div>

        <div
          className="flex items-center justify-center mb-6 sm:mb-8 overflow-x-auto px-2"
          role="list"
          aria-label="登録ステップの進捗"
        >
          {visibleSteps.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isDone = currentStep > step.id;
            return (
              <div key={step.id} className="flex items-center flex-shrink-0" role="listitem">
                <div
                  aria-label={step.title}
                  aria-current={isActive ? "step" : undefined}
                  className={`flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full transition-colors duration-300 ${
                    isActive || isDone
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  } ${isActive ? "ring-4 ring-primary/10" : ""}`}
                >
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
                </div>
                {index < visibleSteps.length - 1 && (
                  <div
                    aria-hidden
                    className={`w-8 sm:w-12 h-0.5 rounded-full flex-shrink-0 transition-colors duration-300 ${
                      isDone ? "bg-primary" : "bg-border"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{currentStepMeta.title}</CardTitle>
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
              {currentStep < 6 ? (
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
