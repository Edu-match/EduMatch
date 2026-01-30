"use client";

import { useState } from "react";
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
} from "lucide-react";
import { updateProfile } from "@/app/_actions";

export type InitialProfile = {
  name: string;
  email: string;
  phone: string | null;
  postal_code: string | null;
  prefecture: string | null;
  city: string | null;
  address: string | null;
  bio?: string | null;
  website?: string | null;
};

const PREFECTURES = [
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県",
  "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県",
  "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県",
  "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県",
];

const steps = [
  { id: 1, title: "基本情報", icon: User },
  { id: 2, title: "所属情報", icon: Building2 },
  { id: 3, title: "住所・連絡先（資料請求用）", icon: MapPin },
  { id: 4, title: "関心・スキル", icon: GraduationCap },
  { id: 5, title: "確認", icon: Check },
];

const schoolTypes = [
  { value: "elementary", label: "小学校" },
  { value: "junior-high", label: "中学校" },
  { value: "high-school", label: "高等学校" },
  { value: "university", label: "大学・専門学校" },
  { value: "company", label: "企業・EdTech事業者" },
  { value: "other", label: "その他" },
];

const interests = [
  "学習管理", "コミュニケーション", "評価・分析", "協働学習",
  "プログラミング教育", "オンライン授業", "AI活用", "データ分析",
  "学校DX", "働き方改革",
];

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
  const [name, setName] = useState(initialProfile?.name ?? "");
  const [email] = useState(initialProfile?.email ?? "");
  const [phone, setPhone] = useState(initialProfile?.phone ?? "");
  const [organization, setOrganization] = useState("");
  const [schoolType, setSchoolType] = useState("");
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");
  const [postalCode, setPostalCode] = useState(initialProfile?.postal_code ?? "");
  const [prefecture, setPrefecture] = useState(initialProfile?.prefecture ?? "");
  const [city, setCity] = useState(initialProfile?.city ?? "");
  const [address, setAddress] = useState(initialProfile?.address ?? "");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [bio, setBio] = useState(initialProfile?.bio ?? "");
  const [website, setWebsite] = useState(initialProfile?.website ?? "");
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

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
              <label className="text-sm font-medium">
                お名前 <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="山田太郎"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                メールアドレス <span className="text-red-500">*</span>
              </label>
              <Input
                type="email"
                placeholder="example@email.com"
                value={email}
                readOnly
                className="bg-muted"
              />
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
                所属組織 <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="○○学校、○○株式会社など"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                組織の種類 <span className="text-red-500">*</span>
              </label>
              <Select value={schoolType} onValueChange={setSchoolType}>
                <SelectTrigger>
                  <SelectValue placeholder="選択してください" />
                </SelectTrigger>
                <SelectContent>
                  {schoolTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">
              資料請求時に送付先として利用します。後からでも設定できます。
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">郵便番号</label>
              <Input
                placeholder="123-4567"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">都道府県</label>
              <Select value={prefecture} onValueChange={setPrefecture}>
                <SelectTrigger>
                  <SelectValue placeholder="選択してください" />
                </SelectTrigger>
                <SelectContent>
                  {PREFECTURES.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">市区町村</label>
              <Input
                placeholder="渋谷区"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">町名・番地・建物名</label>
              <Input
                placeholder="道玄坂1-2-3 〇〇ビル4F"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
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
                基本情報
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">お名前</span>
                  <span>{name || "未入力"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">メールアドレス</span>
                  <span>{email || "未入力"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">電話番号</span>
                  <span>{phone || "未入力"}</span>
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
                  <span className="text-muted-foreground">所属組織</span>
                  <span>{organization || "未入力"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">組織の種類</span>
                  <span>
                    {schoolTypes.find((t) => t.value === schoolType)?.label ||
                      "未入力"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">役職・職種</span>
                  <span>
                    {roles.find((r) => r.value === role)?.label || "未入力"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">所在地</span>
                  <span>{location || "未入力"}</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted/50">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                住所・連絡先（資料請求用）
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">電話番号</span>
                  <span>{phone || "未入力"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">郵便番号</span>
                  <span>{postalCode || "未入力"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">住所</span>
                  <span>
                    {[prefecture, city, address].filter(Boolean).join(" ") || "未入力（スキップ）"}
                  </span>
                </div>
              </div>
            </div>

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
      if (!name.trim()) {
        setValidationError("お名前を入力してください。");
        return;
      }
    } else if (currentStep === 2) {
      if (!organization.trim()) {
        setValidationError("所属組織を入力してください。");
        return;
      }
      if (!schoolType) {
        setValidationError("組織の種類を選択してください。");
        return;
      }
    }
    setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    setValidationError(null);
    setCurrentStep(currentStep - 1);
  };

  const handleSave = async () => {
    setValidationError(null);
    if (!name.trim()) {
      setValidationError("お名前を入力してください。");
      return;
    }
    setSaving(true);
    const { success } = await updateProfile({
      name: name || undefined,
      phone: phone || null,
      postal_code: postalCode || null,
      prefecture: prefecture || null,
      city: city || null,
      address: address || null,
      bio: bio || null,
      website: website || null,
    });
    setSaving(false);
    if (success) router.push(nextUrl ?? "/dashboard");
  };

  return (
    <div className="container py-8">
      <Button variant="ghost" asChild className="mb-4">
        <Link href="/dashboard">
          <ArrowLeft className="h-4 w-4 mr-2" />
          マイページに戻る
        </Link>
      </Button>

      <div className="max-w-2xl mx-auto">
        {isFirstTime && (
          <div className="mb-6 p-4 rounded-lg bg-primary/10 border border-primary/20 text-center">
            <p className="font-medium text-primary">
              ログインが完了しました。次に名前・住所（資料請求の送付先）などを登録してください。
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              スキップして後から設定することもできます。
            </p>
          </div>
        )}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">プロフィール設定</h1>
          <p className="text-muted-foreground">
            あなたに最適な情報をお届けするために、プロフィールを設定してください
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
