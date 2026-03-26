import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "メールアドレスを入力してください")
    .email("メールアドレスの形式が正しくありません"),
  password: z
    .string()
    .min(1, "パスワードを入力してください"),
});

/** メール＋パスワードのみ。名前・所属は登録後のプロフィール画面で入力（Google と同じ流れ） */
export const signupSchema = z.object({
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
