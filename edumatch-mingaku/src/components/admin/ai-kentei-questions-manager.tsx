'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
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
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, Pencil, Plus, Trash2, ArrowLeft, Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react'
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

type Polarity = 'normal' | 'reverse'

interface QuestionFormState {
  question_text: string
  opt0: string
  opt1: string
  opt2: string
  opt3: string
  opt4: string
  correct_answer: string
  explanation: string
  tag: string
  difficulty: Difficulty
  status: QuestionFormStatus
  polarity: Polarity
}

function emptyForm(): QuestionFormState {
  return {
    question_text: '',
    opt0: '',
    opt1: '',
    opt2: '',
    opt3: '',
    opt4: '',
    correct_answer: '',
    explanation: '',
    tag: '',
    difficulty: 'medium',
    status: 'draft',
    polarity: 'normal',
  }
}

// CSV format:
// question_text,option1,option2,option3,option4,option5,correct_answer,explanation,tag,difficulty,status,polarity
// option3/4/5 are optional (can be empty)
// correct_answer must match one of the options exactly
// difficulty: easy|medium|hard  status: draft|published  polarity: normal|reverse

const CSV_HEADERS = [
  'question_text',
  'option1',
  'option2',
  'option3',
  'option4',
  'option5',
  'correct_answer',
  'explanation',
  'tag',
  'difficulty',
  'status',
  'polarity',
] as const

interface CsvRow {
  question_text: string
  options: string[]
  correct_answer: string
  explanation: string
  tag: string
  difficulty: string
  status: string
  polarity: string
}

interface CsvParseResult {
  rows: CsvRow[]
  errors: Array<{ line: number; message: string }>
}

function parseQuestionsCsv(text: string): CsvParseResult {
  const rows: CsvRow[] = []
  const errors: Array<{ line: number; message: string }> = []

  // Split by newlines, handle \r\n
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (lines.length === 0) {
    errors.push({ line: 0, message: 'ファイルが空です' })
    return { rows, errors }
  }

  // Check header
  const headerLine = lines[0].toLowerCase()
  const hasHeader =
    headerLine.startsWith('question_text') || headerLine.startsWith('"question_text')
  const dataLines = hasHeader ? lines.slice(1) : lines

  for (let i = 0; i < dataLines.length; i++) {
    const lineNum = hasHeader ? i + 2 : i + 1
    const line = dataLines[i]
    if (!line) continue

    const cols = parseCsvLine(line)
    if (cols.length < 7) {
      errors.push({ line: lineNum, message: `列数が不足しています（${cols.length}列 / 最低7列必要）` })
      continue
    }

    const [question_text, opt1, opt2, opt3, opt4, opt5, correct_answer, explanation = '', tag = '', difficulty = 'medium', status = 'draft', polarity = 'normal'] = cols

    if (!question_text.trim()) {
      errors.push({ line: lineNum, message: '問題文が空です' })
      continue
    }

    const options = [opt1, opt2, opt3, opt4, opt5]
      .map((o) => o.trim())
      .filter(Boolean)

    if (options.length < 2) {
      errors.push({ line: lineNum, message: '選択肢が2つ未満です' })
      continue
    }

    if (!correct_answer.trim() || !options.includes(correct_answer.trim())) {
      errors.push({ line: lineNum, message: `正解「${correct_answer}」が選択肢に含まれていません` })
      continue
    }

    rows.push({
      question_text: question_text.trim(),
      options,
      correct_answer: correct_answer.trim(),
      explanation: explanation.trim(),
      tag: tag.trim(),
      difficulty: ['easy', 'medium', 'hard'].includes(difficulty.trim()) ? difficulty.trim() : 'medium',
      status: ['draft', 'published'].includes(status.trim()) ? status.trim() : 'draft',
      polarity: status.trim() === 'reverse' ? 'reverse' : (polarity.trim() === 'reverse' ? 'reverse' : 'normal'),
    })
  }

  return { rows, errors }
}

/** RFC 4180-compatible single line CSV parser */
function parseCsvLine(line: string): string[] {
  const cols: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++ }
        else inQuotes = false
      } else {
        cur += ch
      }
    } else {
      if (ch === '"') { inQuotes = true }
      else if (ch === ',') { cols.push(cur); cur = '' }
      else { cur += ch }
    }
  }
  cols.push(cur)
  return cols
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

  // CSV import state
  const [csvDialogOpen, setCsvDialogOpen] = useState(false)
  const [csvRows, setCsvRows] = useState<CsvRow[]>([])
  const [csvErrors, setCsvErrors] = useState<Array<{ line: number; message: string }>>([])
  const [csvImporting, setCsvImporting] = useState(false)
  const [csvImportResults, setCsvImportResults] = useState<{ success: number; failed: number } | null>(null)
  const csvFileRef = useRef<HTMLInputElement>(null)

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
      opt4: opts[4] ?? '',
      correct_answer: q.correct_answer,
      explanation: q.explanation ?? '',
      tag: q.tag ?? '',
      difficulty: normalizeDifficulty(q.difficulty),
      status: q.status === 'published' ? 'published' : 'draft',
      polarity: q.polarity === 'reverse' ? 'reverse' : 'normal',
    })
    setDialogOpen(true)
  }

  const buildOptions = () => {
    return [form.opt0, form.opt1, form.opt2, form.opt3, form.opt4]
      .map((s) => s.trim())
      .filter(Boolean)
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
            polarity: form.polarity,
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
            polarity: form.polarity,
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

  const openCsvDialog = () => {
    setCsvRows([])
    setCsvErrors([])
    setCsvImportResults(null)
    setCsvDialogOpen(true)
  }

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvImportResults(null)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const { rows, errors } = parseQuestionsCsv(text)
      setCsvRows(rows)
      setCsvErrors(errors)
    }
    reader.readAsText(file, 'utf-8')
    e.target.value = ''
  }

  const handleCsvImport = async () => {
    if (csvRows.length === 0) return
    setCsvImporting(true)
    let success = 0
    let failed = 0
    for (const row of csvRows) {
      try {
        const res = await fetch('/api/admin/ai-kentei/questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(row),
        })
        if (res.ok) { success++ } else { failed++ }
      } catch {
        failed++
      }
    }
    setCsvImportResults({ success, failed })
    setCsvImporting(false)
    if (success > 0) {
      toast.success(`${success}件を追加しました${failed > 0 ? `（${failed}件失敗）` : ''}`)
      await load()
    } else {
      toast.error('インポートに失敗しました')
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
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={openCsvDialog} className="shrink-0">
            <Upload className="h-4 w-4 mr-2" />
            CSVで一括追加
          </Button>
          <Button onClick={openCreate} className="shrink-0">
            <Plus className="h-4 w-4 mr-2" />
            問題を追加
          </Button>
        </div>
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
            {[0, 1, 2, 3, 4].map((i) => (
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
            <div className="space-y-2">
              <Label>問いの極性</Label>
              <Select
                value={form.polarity}
                onValueChange={(v) => setForm((f) => ({ ...f, polarity: v as Polarity }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">通常（正しい選択肢を選ぶ）</SelectItem>
                  <SelectItem value="reverse">逆転（誤りを選ぶ）</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="shrink-0 gap-2 border-t px-6 py-4 sm:justify-end">
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

      {/* CSV一括インポートダイアログ */}
      <Dialog open={csvDialogOpen} onOpenChange={(o) => { if (!csvImporting) setCsvDialogOpen(o) }}>
        <DialogContent className="flex h-auto max-h-[min(90dvh,calc(100dvh-1.5rem))] w-[min(42rem,calc(100vw-1.5rem))] max-w-[min(42rem,calc(100vw-1.5rem))] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(42rem,calc(100vw-1.5rem))]">
          <DialogHeader className="shrink-0 space-y-2 px-6 pt-6 pr-14 text-left">
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 shrink-0" />
              CSVで問題を一括追加
            </DialogTitle>
            <DialogDescription>
              CSVファイルを選択すると内容を確認してから一括登録できます。
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-6 pb-4">
          {/* CSV形式説明 */}
          <div className="rounded-md border bg-muted/40 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FileText className="h-4 w-4 shrink-0" />
              CSVファイルの形式
            </div>
            <p className="text-xs text-muted-foreground break-words">
              1行目はヘッダー行（省略可）。文字コードは UTF-8。カンマ区切り。値にカンマ・改行が含まれる場合はダブルクォートで囲んでください。
            </p>
            <div className="-mx-1 overflow-x-auto px-1">
              <table className="text-xs w-full min-w-0 table-fixed border-collapse">
                <colgroup>
                  <col className="w-[2rem]" />
                  <col className="w-[7.5rem]" />
                  <col className="w-[2.25rem]" />
                  <col />
                </colgroup>
                <thead>
                  <tr className="border-b">
                    <th className="p-1 text-left font-medium align-bottom">列</th>
                    <th className="p-1 text-left font-medium align-bottom">列名</th>
                    <th className="p-1 text-center font-medium align-bottom">必須</th>
                    <th className="p-1 text-left font-medium align-bottom">説明・許容値</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  {[
                    ['1', 'question_text', '◎', '問題文'],
                    ['2', 'option1', '◎', '選択肢1'],
                    ['3', 'option2', '◎', '選択肢2'],
                    ['4', 'option3', '', '選択肢3（空欄可）'],
                    ['5', 'option4', '', '選択肢4（空欄可）'],
                    ['6', 'option5', '', '選択肢5（空欄可）'],
                    ['7', 'correct_answer', '◎', '正解（選択肢のいずれかと完全一致）'],
                    ['8', 'explanation', '', '解説（空欄可）'],
                    ['9', 'tag', '', `タグ（例: ${TAGS[0]} など。空欄可）`],
                    ['10', 'difficulty', '', 'easy / medium（省略時） / hard'],
                    ['11', 'status', '', 'draft（省略時） / published'],
                    ['12', 'polarity', '', 'normal（省略時） / reverse'],
                  ].map(([col, name, req, desc]) => (
                    <tr key={col} className="border-b last:border-0">
                      <td className="p-1 align-top">{col}</td>
                      <td className="break-all p-1 align-top font-mono">{name}</td>
                      <td className="p-1 text-center align-top">{req}</td>
                      <td className="break-words p-1 align-top">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-muted-foreground break-words">
              タグの候補: {TAGS.join('、')}
            </p>
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">記入例（1行目はヘッダー、省略可）:</p>
              <pre className="bg-background max-w-full rounded p-2 text-[11px] leading-relaxed whitespace-pre-wrap break-all">{`question_text,option1,option2,option3,option4,option5,correct_answer,explanation,tag,difficulty,status,polarity
AIが生成した文章を人間が書いたように見せることを何と呼ぶか？,ディープフェイク,AIウォッシング,ハルシネーション,プロンプトインジェクション,,ディープフェイク,AIが生成したコンテンツを人間が作成したように偽ること,情報リテラシー,medium,published,normal`}</pre>
            </div>
          </div>

          <Separator className="my-4" />

          {/* ファイル選択 */}
          <div className="space-y-2">
            <Label>CSVファイルを選択</Label>
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <input
                ref={csvFileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleCsvFileChange}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => csvFileRef.current?.click()}
                disabled={csvImporting}
              >
                <Upload className="h-4 w-4 mr-2" />
                ファイルを選択
              </Button>
              {csvRows.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  {csvRows.length}件 読み込み済み
                </span>
              )}
            </div>
          </div>

          {/* エラー表示 */}
          {csvErrors.length > 0 && (
            <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 p-3 space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {csvErrors.length}件の問題が検出されました（該当行はスキップされます）
              </div>
              <ul className="max-h-28 space-y-0.5 overflow-y-auto text-xs text-destructive break-words">
                {csvErrors.map((e, i) => (
                  <li key={i}>行 {e.line}: {e.message}</li>
                ))}
              </ul>
            </div>
          )}

          {/* プレビュー */}
          {csvRows.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium">プレビュー（最初の3件）</p>
              <div className="space-y-2">
                {csvRows.slice(0, 3).map((row, i) => (
                  <div key={i} className="space-y-1 rounded border p-2 text-xs">
                    <p className="line-clamp-2 font-medium break-words">{row.question_text}</p>
                    <p className="break-words text-muted-foreground">
                      選択肢: {row.options.join(' / ')} ｜ 正解: {row.correct_answer}
                      {row.tag && ` ｜ タグ: ${row.tag}`}
                      {` ｜ ${row.difficulty} ｜ ${row.status === 'published' ? '公開' : '下書き'}`}
                    </p>
                  </div>
                ))}
                {csvRows.length > 3 && (
                  <p className="text-xs text-muted-foreground">… 他 {csvRows.length - 3} 件</p>
                )}
              </div>
            </div>
          )}

          {/* 結果表示 */}
          {csvImportResults && (
            <div className={`mt-4 flex items-center gap-2 rounded-md border p-3 text-sm break-words ${csvImportResults.failed === 0 ? 'border-green-400/40 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400' : 'border-amber-400/40 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400'}`}>
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {csvImportResults.success}件追加完了
              {csvImportResults.failed > 0 && `（${csvImportResults.failed}件失敗）`}
            </div>
          )}

          </div>
          <DialogFooter className="shrink-0 gap-2 border-t px-6 py-4 sm:justify-end">
            <Button variant="outline" onClick={() => setCsvDialogOpen(false)} disabled={csvImporting}>
              閉じる
            </Button>
            <Button
              onClick={() => void handleCsvImport()}
              disabled={csvRows.length === 0 || csvImporting || !!csvImportResults}
            >
              {csvImporting ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />インポート中…</>
              ) : (
                `${csvRows.length}件をインポート`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
