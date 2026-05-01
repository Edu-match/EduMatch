import { z } from "zod";
import { validateImageUrl } from "@/lib/image-url-utils";
import {
  SERVICE_CATEGORY_MAX_SELECTION,
  SERVICE_CATEGORY_OTHER_MAX_LENGTH,
  SERVICE_CATEGORY_OTHER_PREFIX,
  SERVICE_CATEGORY_OTHER_VALUE,
  SERVICE_CATEGORY_VALUES,
} from "@/lib/categories";

export const serviceSchema = z.object({
  title: z
    .string()
    .min(1, "タイトルを入力してください")
    .max(200, "タイトルは200文字以内で入力してください"),
  
  description: z
    .string()
    .min(1, "説明を入力してください")
    .max(500, "説明は500文字以内で入力してください"),
  
  category: z
    .string()
    .min(1, "カテゴリを選択してください")
    .refine((value) => {
      const tokens = value
        .split(",")
        .map((token) => token.trim())
        .filter(Boolean);
      return tokens.length > 0 && tokens.length <= SERVICE_CATEGORY_MAX_SELECTION;
    }, `カテゴリは最大${SERVICE_CATEGORY_MAX_SELECTION}つまで選択できます`)
    .refine((value) => {
      const tokens = value
        .split(",")
        .map((token) => token.trim())
        .filter(Boolean);
      return tokens.every((token) => {
        if (SERVICE_CATEGORY_VALUES.includes(token as (typeof SERVICE_CATEGORY_VALUES)[number])) {
          return true;
        }
        if (token === SERVICE_CATEGORY_OTHER_VALUE) {
          return true;
        }
        if (token.startsWith(SERVICE_CATEGORY_OTHER_PREFIX)) {
          const custom = token.slice(SERVICE_CATEGORY_OTHER_PREFIX.length).trim();
          return custom.length > 0 && custom.length <= SERVICE_CATEGORY_OTHER_MAX_LENGTH;
        }
        return false;
      });
    }, "カテゴリの形式が正しくありません"),
  
  content: z
    .string()
    .min(10, "コンテンツは10文字以上で入力してください")
    .max(50000, "コンテンツは50000文字以内で入力してください"),
  
  price_info: z
    .string()
    .min(1, "料金情報を入力してください")
    .max(200, "料金情報は200文字以内で入力してください"),
  
  thumbnail_url: z
    .string()
    .optional()
    .refine(
      (v) => !v || v.trim() === "" || validateImageUrl(v.trim()).ok,
      "画像URLはGoogle Drive、GitHub、またはアップロード画像のみ対応しています"
    ),
  
  youtube_url: z
    .string()
    .url("有効なYouTube URLを入力してください")
    .optional()
    .or(z.literal("")),
  
  status: z.enum(["DRAFT", "PENDING", "APPROVED", "REJECTED"]),
});

export type ServiceFormData = z.infer<typeof serviceSchema>;
