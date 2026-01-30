import { z } from "zod";

export const loginSchema = z.object({
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
});

export const signupSchema = z.object({
  name: z
    .string()
    .min(1, "表示名を入力してください")
    .max(100, "表示名は100文字以内で入力してください"),
  organization: z
    .string()
    .max(200, "企業名・学校名は200文字以内で入力してください")
    .optional(),
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

// Provider用のバリデーション（組織名を必須にする）
export const signupProviderSchema = signupSchema.extend({
  organization: z
    .string()
    .min(1, "企業名・学校名を入力してください")
    .max(200, "企業名・学校名は200文字以内で入力してください"),
});

export type SignupProviderInput = z.infer<typeof signupProviderSchema>;
