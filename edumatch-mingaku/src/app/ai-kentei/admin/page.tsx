'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Plus,
  Search,
  FileText,
  Users,
  Award,
  Sparkles,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  ArrowLeft,
  Loader2,
  BarChart3,
} from 'lucide-react'
import { toast } from 'sonner'

interface Question {
  id: string
  question_number: number
  question_text: string
  options: string[]
  correct_answer: string
  explanation: string | null
  tag: string | null
  difficulty: string
  status: string
  created_by_ai: boolean
  reviewed_by_human: boolean
}

interface Stats {
  totalQuestions: number
  publishedQuestions: number
  draftQuestions: number
  totalExams: number
  passedExams: number
  totalCertificates: number
}

const TAGS = [
  '基本原則', '情報リテラシー', '著作権・法律', '学習活動', '発達段階',
  '学校運営', '教員活用', 'プライバシー', '倫理', '授業設計', '特別支援', '学術倫理',
]

export default function AiKenteiAdminPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTag, setFilterTag] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showAIDialog, setShowAIDialog] = useState(false)
  const [aiGenerating, setAIGenerating] = useState(false)
  const [aiTopic, setAITopic] = useState('')

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const [questionsRes, statsRes] = await Promise.all([
        fetch('/api/ai-kentei/admin/questions'),
        fetch('/api/ai-kentei/admin/stats'),
      ])

      if (questionsRes.status === 403 || statsRes.status === 403) {
        toast.error('管理者権限が必要です')
        return
      }

      if (questionsRes.ok) {
        const data = await questionsRes.json()
        setQuestions(data.questions)
      }
      if (statsRes.ok) {
        const data = await statsRes.json()
        setStats(data)
      }
    } catch {
      toast.error('データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusToggle = async (question: Question) => {
    const newStatus = question.status === 'published' ? 'draft' : 'published'
    try {
      const response = await fetch(`/api/ai-kentei/admin/questions/${question.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (response.ok) {
        setQuestions(questions.map((q) => (q.id === question.id ? { ...q, status: newStatus } : q)))
        toast.success(`問題を${newStatus === 'published' ? '公開' : '非公開に'}しました`)
      }
    } catch {
      toast.error('更新に失敗しました')
    }
  }

  const handleDelete = async (questionId: string) => {
    if (!confirm('この問題を削除しますか？')) return
    try {
      const response = await fetch(`/api/ai-kentei/admin/questions/${questionId}`, { method: 'DELETE' })
      if (response.ok) {
        setQuestions(questions.filter((q) => q.id !== questionId))
        toast.success('問題を削除しました')
      }
    } catch {
      toast.error('削除に失敗しました')
    }
  }

  const handleAIGenerate = async () => {
    if (!aiTopic.trim()) { toast.error('トピックを入力してください'); return }
    setAIGenerating(true)
    try {
      const response = await fetch('/api/ai-kentei/admin/questions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: aiTopic }),
      })
      if (response.ok) {
        const data = await response.json()
        setQuestions([data.question, ...questions])
        toast.success('AIが問題を生成しました（下書きとして保存）')
        setShowAIDialog(false)
        setAITopic('')
      } else {
        throw new Error('Generation failed')
      }
    } catch {
      toast.error('問題の生成に失敗しました')
    } finally {
      setAIGenerating(false)
    }
  }

  const filteredQuestions = questions.filter((q) => {
    const matchesSearch = q.question_text.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesTag = filterTag === 'all' || q.tag === filterTag
    const matchesStatus = filterStatus === 'all' || q.status === filterStatus
    return matchesSearch && matchesTag && matchesStatus
  })

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="container py-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/ai-kentei"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            AI検定トップ
          </Link>
          <Badge variant="secondary">管理画面</Badge>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {[
            { label: '問題総数', value: stats.totalQuestions, icon: FileText, color: '' },
            { label: '公開中', value: stats.publishedQuestions, icon: Eye, color: 'text-green-600' },
            { label: '下書き', value: stats.draftQuestions, icon: EyeOff, color: 'text-muted-foreground' },
            { label: '受験数', value: stats.totalExams, icon: Users, color: '' },
            { label: '合格数', value: stats.passedExams, icon: BarChart3, color: 'text-primary' },
            { label: '認定証', value: stats.totalCertificates, icon: Award, color: '' },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <Icon className="h-4 w-4" />
                  {label}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Questions Management */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>問題管理</CardTitle>
              <CardDescription>検定問題の追加・編集・削除</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowAIDialog(true)} variant="outline">
                <Sparkles className="h-4 w-4 mr-2" />
                AIで生成
              </Button>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                問題を追加
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="問題を検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterTag} onValueChange={setFilterTag}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="タグで絞り込み" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべてのタグ</SelectItem>
                {TAGS.map((tag) => (
                  <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="ステータス" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="published">公開中</SelectItem>
                <SelectItem value="draft">下書き</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>問題</TableHead>
                  <TableHead className="w-32">タグ</TableHead>
                  <TableHead className="w-24">難易度</TableHead>
                  <TableHead className="w-24">ステータス</TableHead>
                  <TableHead className="w-32">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuestions.map((question) => (
                  <TableRow key={question.id}>
                    <TableCell className="font-medium">{question.question_number}</TableCell>
                    <TableCell>
                      <div className="max-w-md">
                        <p className="truncate">{question.question_text}</p>
                        {question.created_by_ai && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            <Sparkles className="h-3 w-3 mr-1" />
                            AI生成
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {question.tag && <Badge variant="secondary" className="text-xs">{question.tag}</Badge>}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          question.difficulty === 'easy'
                            ? 'border-green-500 text-green-600'
                            : question.difficulty === 'hard'
                            ? 'border-red-500 text-red-600'
                            : 'border-yellow-500 text-yellow-600'
                        }
                      >
                        {question.difficulty === 'easy' ? '基本' : question.difficulty === 'hard' ? '応用' : '標準'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={question.status === 'published' ? 'default' : 'secondary'}
                        className={question.status === 'published' ? 'bg-green-600' : ''}
                      >
                        {question.status === 'published' ? '公開中' : '下書き'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleStatusToggle(question)}
                          title={question.status === 'published' ? '非公開にする' : '公開する'}
                        >
                          {question.status === 'published' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingQuestion(question)}
                          title="編集"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(question.id)}
                          title="削除"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredQuestions.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              該当する問題が見つかりませんでした
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Generate Dialog */}
      <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AIで問題を生成
            </DialogTitle>
            <DialogDescription>
              トピックを入力すると、AIが関連する問題を自動生成します（下書きとして保存）
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="topic">トピック</Label>
              <Textarea
                id="topic"
                placeholder="例：情報モラル教育、プライバシー保護、著作権..."
                value={aiTopic}
                onChange={(e) => setAITopic(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAIDialog(false)}>キャンセル</Button>
            <Button onClick={handleAIGenerate} disabled={aiGenerating}>
              {aiGenerating ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />生成中...</>
              ) : (
                <><Sparkles className="mr-2 h-4 w-4" />生成する</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dialog */}
      <QuestionDialog
        question={editingQuestion}
        open={showAddDialog || !!editingQuestion}
        onOpenChange={(open) => {
          if (!open) { setShowAddDialog(false); setEditingQuestion(null) }
        }}
        onSave={(question) => {
          if (editingQuestion) {
            setQuestions(questions.map((q) => (q.id === question.id ? question : q)))
          } else {
            setQuestions([question, ...questions])
          }
          setShowAddDialog(false)
          setEditingQuestion(null)
        }}
        tags={TAGS}
      />
    </div>
  )
}

interface QuestionDialogProps {
  question: Question | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (question: Question) => void
  tags: string[]
}

function QuestionDialog({ question, open, onOpenChange, onSave, tags }: QuestionDialogProps) {
  const [questionText, setQuestionText] = useState('')
  const [options, setOptions] = useState(['', '', '', ''])
  const [correctAnswer, setCorrectAnswer] = useState('')
  const [explanation, setExplanation] = useState('')
  const [tag, setTag] = useState('none')
  const [difficulty, setDifficulty] = useState('medium')
  const [status, setStatus] = useState('draft')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (question) {
      setQuestionText(question.question_text)
      setOptions(question.options)
      setCorrectAnswer(question.correct_answer)
      setExplanation(question.explanation || '')
      setTag(question.tag || 'none')
      setDifficulty(question.difficulty)
      setStatus(question.status)
    } else {
      setQuestionText('')
      setOptions(['', '', '', ''])
      setCorrectAnswer('')
      setExplanation('')
      setTag('none')
      setDifficulty('medium')
      setStatus('draft')
    }
  }, [question, open])

  const handleSave = async () => {
    if (!questionText.trim()) { toast.error('問題文を入力してください'); return }
    if (options.some((o) => !o.trim())) { toast.error('すべての選択肢を入力してください'); return }
    if (!correctAnswer) { toast.error('正解を選択してください'); return }

    setSaving(true)
    try {
      const body = {
        question_text: questionText,
        options,
        correct_answer: correctAnswer,
        explanation: explanation || null,
        tag: tag === 'none' ? null : tag,
        difficulty,
        status,
      }

      const response = await fetch(
        question ? `/api/ai-kentei/admin/questions/${question.id}` : '/api/ai-kentei/admin/questions',
        {
          method: question ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      )

      if (response.ok) {
        const data = await response.json()
        onSave(data.question)
        toast.success(question ? '問題を更新しました' : '問題を追加しました')
      } else {
        throw new Error('Save failed')
      }
    } catch {
      toast.error('保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{question ? '問題を編集' : '問題を追加'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="questionText">問題文</Label>
            <Textarea
              id="questionText"
              placeholder="問題文を入力..."
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>選択肢と正解</Label>
            {options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  placeholder={`選択肢 ${index + 1}`}
                  value={option}
                  onChange={(e) => {
                    const newOptions = [...options]
                    newOptions[index] = e.target.value
                    setOptions(newOptions)
                  }}
                />
                <Button
                  variant={correctAnswer === option && option ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCorrectAnswer(option)}
                  disabled={!option}
                >
                  正解
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="explanation">解説（任意）</Label>
            <Textarea
              id="explanation"
              placeholder="解説を入力..."
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>タグ</Label>
              <Select value={tag} onValueChange={setTag}>
                <SelectTrigger>
                  <SelectValue placeholder="タグを選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">なし</SelectItem>
                  {tags.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>難易度</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">基本</SelectItem>
                  <SelectItem value="medium">標準</SelectItem>
                  <SelectItem value="hard">応用</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>ステータス</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">下書き</SelectItem>
                  <SelectItem value="published">公開</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>キャンセル</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />保存中...</> : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
