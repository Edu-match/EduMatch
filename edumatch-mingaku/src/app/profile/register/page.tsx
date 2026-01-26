"use client";

import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import {
  User,
  Building2,
  GraduationCap,
  ArrowLeft,
  ArrowRight,
  Check,
} from "lucide-react";

const steps = [
  { id: 1, title: "基本情報", icon: User },
  { id: 2, title: "所属情報", icon: Building2 },
  { id: 3, title: "関心・スキル", icon: GraduationCap },
  { id: 4, title: "確認", icon: Check },
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

export default function ProfileRegisterPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [organization, setOrganization] = useState("");
  const [schoolType, setSchoolType] = useState("");
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [bio, setBio] = useState("");

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
                onChange={(e) => setEmail(e.target.value)}
              />
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
                placeholder="EdTechに関する取り組みや、関心事について教えてください"
                rows={5}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>
          </div>
        );

      case 4:
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
                    <p>{bio}</p>
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

  return (
    <div className="container py-8">
      <Button variant="ghost" asChild className="mb-4">
        <Link href="/dashboard">
          <ArrowLeft className="h-4 w-4 mr-2" />
          ダッシュボードに戻る
        </Link>
      </Button>

      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">プロファイル設定</h1>
          <p className="text-muted-foreground">
            あなたに最適な情報をお届けするために、プロファイルを設定してください
          </p>
        </div>

        {/* ステップインジケーター */}
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

            <div className="flex justify-between mt-8">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(currentStep - 1)}
                disabled={currentStep === 1}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                戻る
              </Button>
              {currentStep < 4 ? (
                <Button onClick={() => setCurrentStep(currentStep + 1)}>
                  次へ
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button asChild>
                  <Link href="/dashboard">
                    保存して完了
                    <Check className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
