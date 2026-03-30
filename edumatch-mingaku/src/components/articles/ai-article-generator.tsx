"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wand2, Loader2, AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";

export interface GeneratedArticle {
  title: string;
  leadText: string;
  content: string;
  category: string;
  tags: string;
}

interface AiArticleGeneratorProps {
  onGenerated: (data: GeneratedArticle) => void;
  isPanelOpen?: boolean;
  onTogglePanel?: () => void;
  hasGeneratedArticle?: boolean;
}

export function AiArticleGenerator({
  onGenerated,
  isPanelOpen,
  onTogglePanel,
  hasGeneratedArticle,
}: AiArticleGeneratorProps) {
  const [url, setUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedTitle, setGeneratedTitle] = useState<string | null>(null);

  const handleGenerate = async () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;

    setIsGenerating(true);
    setError(null);
    setGeneratedTitle(null);

    try {
      const res = await fetch("/api/ai-article-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmedUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "記事の生成に失敗しました");
        return;
      }

      setGeneratedTitle((data as GeneratedArticle).title ?? "");
      onGenerated(data as GeneratedArticle);
    } catch {
      setError("ネットワークエラーが発生しました。もう一度お試しください。");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="border-primary/30 bg-gradient-to-b from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-primary" />
          AI記事自動生成
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          URLを入力するとAIが記事を自動生成します
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          type="url"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !isGenerating && url.trim()) {
              handleGenerate();
            }
          }}
          placeholder="https://example.com/article"
          disabled={isGenerating}
          className="text-sm"
        />

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <p className="text-xs">{error}</p>
          </div>
        )}

        {isGenerating && (
          <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            <p className="text-xs">URLを読み込み、記事を生成中...</p>
          </div>
        )}

        {generatedTitle && !isGenerating && (
          <div className="flex items-start gap-2 p-2 rounded-md bg-green-50 text-green-800">
            <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <p className="text-xs line-clamp-2">{generatedTitle}</p>
          </div>
        )}

        <Button
          className="w-full"
          size="sm"
          onClick={handleGenerate}
          disabled={isGenerating || !url.trim()}
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              生成中...
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4 mr-2" />
              生成する
            </>
          )}
        </Button>

        {hasGeneratedArticle && onTogglePanel && (
          <Button
            variant={isPanelOpen ? "secondary" : "outline"}
            className="w-full"
            size="sm"
            onClick={onTogglePanel}
          >
            {isPanelOpen ? (
              <>
                <EyeOff className="h-4 w-4 mr-2" />
                プレビューを閉じる
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                プレビューを開く
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
