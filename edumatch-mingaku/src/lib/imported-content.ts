/**
 * インポートコンテンツの保存形式
 * content フィールドに __IMPORT__${type}__\n${rawContent} で保存
 */
export const IMPORT_PREFIX = "__IMPORT__";
export type ImportType = "html" | "css" | "md" | "tsx";

export function isImportedContent(content: string): boolean {
  return content.startsWith(IMPORT_PREFIX);
}

export function parseImportedContent(content: string): { type: ImportType; raw: string } | null {
  if (!content.startsWith(IMPORT_PREFIX)) return null;
  const rest = content.slice(IMPORT_PREFIX.length);
  const match = rest.match(/^(html|css|md|tsx)__\n([\s\S]*)$/);
  if (!match) return null;
  return { type: match[1] as ImportType, raw: match[2] };
}

export function toImportedContent(type: ImportType, raw: string): string {
  return `${IMPORT_PREFIX}${type}__\n${raw}`;
}
