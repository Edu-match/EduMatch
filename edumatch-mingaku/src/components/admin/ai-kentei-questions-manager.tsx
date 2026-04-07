'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, Pencil, Plus, Trash2, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

export interface AiKenteiQuestionRow {
  id: string
  question_number: number
  question_text: string
  options: string[]
  correct_answer: string
  explanation: string | null
  tag: string | null
  difficulty: string
  polarity: string
  status: string
  created_by_ai: boolean
  reviewed_by_human: boolean
}

const TAGS = [
  '基本原則',
  '情報リテラシー',
  '著作権・法律',
  '学習活動',
  '発達段階',
  '学校運営',
]

type Difficulty = 'easy' | 'medium' | 'hard'
type QuestionFormStatus = 'draft' | 'published'

interface QuestionFormState {
  question_text: string
  opt0: string
  opt1: string
  opt2: string
  opt3: string
  correct_answer: string
  explanation: string
  tag: string
  difficulty: Difficulty
  status: QuestionFormStatus
}

function emptyForm(): QuestionFormState {
  return {
    question_text: '',
    opt0: '',
    opt1: '',
    opt2: '',
    opt3: '',
    correct_answer: '',
    explanation: '',
    tag: '',
    difficulty: 'medium',
    status: 'draft',
  }
}

function normalizeDifficulty(v: string): Difficulty {
  return v === 'easy' || v === 'hard' ? v : 'medium'
}

export function AiKenteiQuestionsManager() {
  const [questions, setQuestions] = useState<AiKenteiQuestionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<AiKenteiQuestionRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<QuestionFormState>(emptyForm())
  const [deleteTarget, setDeleteTarget] = useState<AiKenteiQuestionRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/ai-kentei/questions')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '取得に失敗しました')
      setQuestions(data.questions ?? [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const publishedCount = questions.filter((q) => q.status === 'published').length

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm())
    setDialogOpen(true)
  }

  const openEdit = (q: AiKenteiQuestionRow) => {
    setEditing(q)
    const opts = Array.isArray(q.options) ? q.options : []
    setForm({
      question_text: q.question_text,
      opt0: opts[0] ?? '',
      opt1: opts[1] ?? '',
      opt2: opts[2] ?? '',
      opt3: opts[3] ?? '',
      correct_answer: q.correct_answer,
      explanation: q.explanation ?? '',
      tag: q.tag ?? '',
      difficulty: normalizeDifficulty(q.difficulty),
      status: q.status === 'published' ? 'published' : 'draft',
    })
    setDialogOpen(true)
  }

  const buildOptions = () => {
    return [form.opt0, form.opt1, form.opt2, form.opt3].map((s) => s.trim()).filter(Boolean)
  }

  const handleSave = async () => {
    const options = buildOptions()
    if (options.length < 2) {
      toast.error('選択肢を2つ以上入力してください')
      return
    }
    if (!form.correct_answer || !options.includes(form.correct_answer)) {
      toast.error('正解を、入力した選択肢のいずれかと同じ文字列で選んでください')
      return
    }

    setSaving(true)
    try {
      if (editing) {
        const res = await fetch(`/api/admin/ai-kentei/questions/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question_text: form.question_text,
            options,
            correct_answer: form.correct_answer,
            explanation: form.explanation.trim() || null,
            tag: form.tag.trim() || null,
            difficulty: form.difficulty,
            status: form.status,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? '更新に失敗しました')
        toast.success('更新しました')
      } else {
        const res = await fetch('/api/admin/ai-kentei/questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question_text: form.question_text,
            options,
            correct_answer: form.correct_answer,
            explanation: form.explanation.trim() || null,
            tag: form.tag.trim() || null,
            difficulty: form.difficulty,
            status: form.status,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? '作成に失敗しました')
        toast.success('作成しました')
      }
      setDialogOpen(false)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/ai-kentei/questions/${deleteTarget.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '削除に失敗しました')
      toast.success('削除しました')
      setDeleteTarget(null)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '削除に失敗しました')
    } finally {
      setDeleting(false)
    }
  }

  const correctSelectOptions = buildOptions()

  return (
    <>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/approvals" className="inline-flex items-center">
            <ArrowLeft className="h-4 w-4 mr-2" />
            管理者メニューへ
          </Link>
        </Button>
        <Button onClick={openCreate} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          問題を追加
        </Button>
      </div>

      <Card className="mb-6 border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
        <CardHeader className="py-3">
          <CardTitle className="text-base">出題について</CardTitle>
          <CardDescription>
            検定は「公開（published）」の問題から最大50件をプールし、25問をランダム出題します。
            公開が25問未満のときは試験開始に失敗します。現在の公開数:{' '}
            <strong>{publishedCount}</strong> 問
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>問題一覧</CardTitle>
          <CardDescription>
            ダウンロードフォルダのアプリに入っていた問題データではなく、ここまたは Supabase で登録した内容が出題されます。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : questions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              問題がまだありません。「問題を追加」から登録するか、Supabase の Table Editor を利用してください。
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>問題文</TableHead>
                    <TableHead className="w-28">タグ</TableHead>
                    <TableHead className="w-24">難易度</TableHead>
                    <TableHead className="w-24">状態</TableHead>
                    <TableHead className="w-28 text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questions.map((q) => (
                    <TableRow key={q.id}>
                      <TableCell className="text-muted-foreground">{q.question_number}</TableCell>
                      <TableCell className="max-w-md">
                        <span className="line-clamp-2 text-sm">{q.question_text}</span>
                      </TableCell>
                      <TableCell>
                        {q.tag ? (
                          <Badge variant="secondary" className="text-xs font-normal">
                            {q.tag}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">{q.difficulty}</TableCell>
                      <TableCell>
                        {q.status === 'published' ? (
                          <Badge className="bg-green-600">公開</Badge>
                        ) : (
                          <Badge variant="outline">下書き</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(q)} aria-label="編集">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(q)}
                          aria-label="削除"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? '問題を編集' : '問題を追加'}</DialogTitle>
            <DialogDescription>
              正解は選択肢のいずれかと<strong>完全一致</strong>する文字列にしてください。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="q-text">問題文</Label>
              <Textarea
                id="q-text"
                value={form.question_text}
                onChange={(e) => setForm((f) => ({ ...f, question_text: e.target.value }))}
                rows={4}
                placeholder="問題文を入力"
              />
            </div>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-1">
                <Label htmlFor={`opt-${i}`}>選択肢 {i + 1}</Label>
                <Input
                  id={`opt-${i}`}
                  value={form[`opt${i}` as keyof typeof form] as string}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, [`opt${i}`]: e.target.value } as typeof f))
                  }
                  placeholder={i < 2 ? '必須' : '任意（空欄可）'}
                />
              </div>
            ))}
            <div className="space-y-2">
              <Label>正解</Label>
              <Select
                value={form.correct_answer}
                onValueChange={(v) => setForm((f) => ({ ...f, correct_answer: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="選択肢を入力後に選んでください" />
                </SelectTrigger>
                <SelectContent>
                  {correctSelectOptions.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o.length > 60 ? `${o.slice(0, 60)}…` : o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expl">解説（任意）</Label>
              <Textarea
                id="expl"
                value={form.explanation}
                onChange={(e) => setForm((f) => ({ ...f, explanation: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>タグ</Label>
                <Select
                  value={form.tag || '__none__'}
                  onValueChange={(v) => setForm((f) => ({ ...f, tag: v === '__none__' ? '' : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="未設定" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">未設定</SelectItem>
                    {TAGS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>難易度</Label>
                <Select
                  value={form.difficulty}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, difficulty: v as Difficulty }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">easy</SelectItem>
                    <SelectItem value="medium">medium</SelectItem>
                    <SelectItem value="hard">hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>状態</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((f) => ({ ...f, status: v as QuestionFormStatus }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">下書き（出題されません）</SelectItem>
                  <SelectItem value="published">公開（出題プールに含む）</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? '更新' : '作成'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>この問題を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              削除すると元に戻せません。既存の試験セッションの表示に影響する場合があります。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>キャンセル</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={() => void handleDelete()}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : '削除'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
