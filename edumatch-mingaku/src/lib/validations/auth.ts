import { z } from "zod";
import { ORGANIZATION_TYPE_VALUES } from "@/lib/organization-types";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "メールアドレスを入力してください")
    .email("メールアドレスの形式が正しくありません"),
  password: z
    .string()
    .min(1, "パスワードを入力してください"),
});

export const signupSchema = z.object({
  legalName: z
    .string()
    .min(1, "本名を入力してください")
    .max(100, "本名は100文字以内で入力してください"),
  name: z
    .string()
    .min(1, "表示名を入力してください")
    .max(100, "表示名は100文字以内で入力してください"),
  organization: z
    .string()
    .min(1, "所属組織を入力してください")
    .max(200, "所属組織は200文字以内で入力してください"),
  organizationType: z
    .string()
    .min(1, "組織の種類を選択してください")
    .refine(
      (v): v is (typeof ORGANIZATION_TYPE_VALUES)[number] =>
        (ORGANIZATION_TYPE_VALUES as readonly string[]).includes(v),
      { message: "組織の種類を選択してください" }
    ),
  email: z
    .string()
    .min(1, "メールアドレスを入力してください")
    .email("メールアドレスの形式が正しくありません"),
  password: z
    .string()
    .min(8, "パスワードは8文字以上で入力してください")
    .regex(/[A-Z]/, "パスワードに大文字を含めてください")
    .regex(/[a-z]/, "パスワードに小文字を含めてください")
    .regex(/[0-9]/, "パスワードに数字を含めてください"),
  agreedToTerms: z
    .boolean()
    .refine((val) => val === true, "利用規約とプライバシーポリシーに同意してください"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;

// Provider用（現行フローは閲覧者登録のみだが、将来用に同一スキーマを参照）
export const signupProviderSchema = signupSchema;

export type SignupProviderInput = z.infer<typeof signupProviderSchema>;
