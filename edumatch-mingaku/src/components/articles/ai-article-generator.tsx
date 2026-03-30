"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wand2, Loader2, AlertCircle, CheckCircle2, RotateCcw } from "lucide-react";

interface GeneratedArticle {
  title: string;
  leadText: string;
  content: string;
  category: string;
  tags: string;
}

interface AiArticleGeneratorProps {
  onGenerated: (data: GeneratedArticle) => void;
}

export function AiArticleGenerator({ onGenerated }: AiArticleGeneratorProps) {
  const [url, setUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<GeneratedArticle | null>(null);

  const handleGenerate = async () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;

    setIsGenerating(true);
    setError(null);
    setGenerated(null);

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

      setGenerated(data as GeneratedArticle);
    } catch {
      setError("ネットワークエラーが発生しました。もう一度お試しください。");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = () => {
    if (!generated) return;
    onGenerated(generated);
    setGenerated(null);
    setUrl("");
  };

  const handleReset = () => {
    setGenerated(null);
    setError(null);
    setUrl("");
  };

  return (
    <Card className="border-primary/30 bg-gradient-to-b from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-primary" />
          AI記事生成
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          URLを入力するとAIが記事を自動生成します
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {!generated ? (
          <>
            <div className="space-y-2">
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
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <p className="text-xs">{error}</p>
              </div>
            )}

            {isGenerating && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                <div className="text-xs">
                  <p className="font-medium">生成中...</p>
                  <p>URLを読み込み、記事を作成しています</p>
                </div>
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
          </>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start gap-2 p-3 rounded-md bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              <div className="text-xs space-y-1 min-w-0">
                <p className="font-medium">記事を生成しました</p>
                <p className="line-clamp-2 text-green-700 dark:text-green-300">
                  {generated.title}
                </p>
                {generated.category && (
                  <p className="text-green-600 dark:text-green-400">
                    カテゴリ: {generated.category}
                  </p>
                )}
              </div>
            </div>

            <Button className="w-full" size="sm" onClick={handleApply}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              エディタに反映
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              size="sm"
              onClick={handleReset}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              やり直す
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
