import { NextResponse } from 'next/server'
import { getCurrentUser, getCurrentProfile } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * ADMIN専用：AI検定テーブルをセットアップする
 * テーブルが存在しない場合に作成し、問題が0件の場合はサンプルを投入する
 */
export async function POST() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const profile = await getCurrentProfile()
  if (profile?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'ADMIN権限が必要です' }, { status: 403 })
  }

  const results: string[] = []

  try {
    // テーブル作成（存在しない場合）
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS ai_kentei_questions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        question_number SERIAL,
        question_text TEXT NOT NULL,
        options JSONB NOT NULL DEFAULT '[]',
        correct_answer TEXT NOT NULL,
        explanation TEXT,
        tag TEXT,
        difficulty TEXT DEFAULT 'medium',
        polarity TEXT DEFAULT 'normal',
        status TEXT DEFAULT 'draft',
        created_by_ai BOOLEAN DEFAULT FALSE,
        reviewed_by_human BOOLEAN DEFAULT FALSE,
        source_ref TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    results.push('✅ ai_kentei_questions テーブル確認')
  } catch (e) {
    results.push(`⚠️ ai_kentei_questions: ${e instanceof Error ? e.message : String(e)}`)
  }

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS ai_kentei_exam_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id TEXT UNIQUE NOT NULL,
        user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
        selected_question_ids JSONB NOT NULL DEFAULT '[]',
        answers JSONB NOT NULL DEFAULT '{}',
        score INTEGER,
        passed BOOLEAN,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    results.push('✅ ai_kentei_exam_sessions テーブル確認')
  } catch (e) {
    results.push(`⚠️ ai_kentei_exam_sessions: ${e instanceof Error ? e.message : String(e)}`)
  }

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS ai_kentei_certificates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        certificate_id TEXT UNIQUE NOT NULL,
        exam_session_id UUID REFERENCES ai_kentei_exam_sessions(id) ON DELETE CASCADE,
        user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
        public_display_name TEXT NOT NULL,
        name_type TEXT DEFAULT 'custom',
        photo_url TEXT,
        score INTEGER NOT NULL,
        passed_at TIMESTAMPTZ DEFAULT NOW(),
        is_public BOOLEAN DEFAULT TRUE,
        share_slug TEXT UNIQUE NOT NULL,
        email_sent BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    results.push('✅ ai_kentei_certificates テーブル確認')
  } catch (e) {
    results.push(`⚠️ ai_kentei_certificates: ${e instanceof Error ? e.message : String(e)}`)
  }

  // 問題数確認
  try {
    const countResult = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
      'SELECT COUNT(*) as count FROM ai_kentei_questions'
    )
    const count = Number(countResult[0]?.count ?? 0)
    results.push(`📊 現在の問題数: ${count}件`)

    if (count === 0) {
      // サンプル問題を投入
      await seedSampleQuestions()
      results.push('✅ サンプル問題30件を投入しました')
    }
  } catch (e) {
    results.push(`⚠️ 問題数確認失敗: ${e instanceof Error ? e.message : String(e)}`)
  }

  return NextResponse.json({ ok: true, results })
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const profile = await getCurrentProfile()
  if (profile?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'ADMIN権限が必要です' }, { status: 403 })
  }

  const status: Record<string, string> = {}

  for (const table of ['ai_kentei_questions', 'ai_kentei_exam_sessions', 'ai_kentei_certificates']) {
    try {
      const rows = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
        `SELECT COUNT(*) as count FROM ${table}`
      )
      status[table] = `✅ ${Number(rows[0]?.count ?? 0)}件`
    } catch {
      status[table] = '❌ テーブルなし'
    }
  }

  return NextResponse.json({ status })
}

async function seedSampleQuestions() {
  const questions = [
    {
      text: '文部科学省の「生成AIの利用に関する暫定的なガイドライン」において、学校教育での生成AI利用の基本的なスタンスとして最も適切なものはどれですか？',
      opts: ['全面的に禁止する', '学習に効果的な場面では積極的に活用し、課題もある場面では制限する', 'すべての場面で自由に利用させる', '教師のみが利用できる'],
      ans: '学習に効果的な場面では積極的に活用し、課題もある場面では制限する',
      exp: '文科省ガイドラインは全面禁止ではなく、教育効果が期待できる場面と課題がある場面を整理し、適切に活用することを推奨しています。',
      tag: '基本原則', diff: 'easy'
    },
    {
      text: '生成AIの特性として「ハルシネーション」とは何を指しますか？',
      opts: ['AIが感情を持つこと', 'AIがもっともらしく誤った情報を生成すること', 'AIの処理速度が低下すること', 'AIが意図的に嘘をつくこと'],
      ans: 'AIがもっともらしく誤った情報を生成すること',
      exp: 'ハルシネーションとは、AIが事実ではない情報を自信満々に生成する現象です。',
      tag: '基本原則', diff: 'medium'
    },
    {
      text: '生成AIを教育で活用する際、最も重要な教師の役割として適切なものはどれですか？',
      opts: ['AIに任せてできるだけ関与しない', 'AI出力を無批判に正解として扱う', 'AI活用の目的を明確にし、批判的思考を指導する', 'AIの使い方を児童生徒に教えない'],
      ans: 'AI活用の目的を明確にし、批判的思考を指導する',
      exp: '教師はAI活用の目的を明確にし、批判的思考を指導することが重要です。',
      tag: '基本原則', diff: 'easy'
    },
    {
      text: '生成AIが生成した文章を授業で使用する際、教師が指導すべき最重要事項はどれですか？',
      opts: ['AIの操作方法を詳しく教える', '内容の正確性を自分で検証する姿勢を育てる', 'AI文章は常に正確なので活用を促す', 'AIを使わない方法と比較させる'],
      ans: '内容の正確性を自分で検証する姿勢を育てる',
      exp: '生成AIはハルシネーションがあるため、出力内容を批判的に評価し確認する習慣が重要です。',
      tag: '情報リテラシー', diff: 'easy'
    },
    {
      text: '生成AIに入力してはいけない情報として最も適切なものはどれですか？',
      opts: ['公開されている歴史的事実', '個人情報や機密情報', '一般的な数学の問題', '辞書に載っている言葉の意味'],
      ans: '個人情報や機密情報',
      exp: '生成AIサービスは入力データが学習に使用される場合があります。個人情報・機密情報の入力は情報漏洩のリスクがあります。',
      tag: '情報リテラシー', diff: 'easy'
    },
    {
      text: 'フェイクニュースや誤情報が生成AIによって拡散しやすい理由として最も適切なものはどれですか？',
      opts: ['AIは常に嘘をつくから', 'AIがもっともらしい文章を流暢に生成できるから', 'AIはインターネットに接続できないから', 'AIは感情を持っているから'],
      ans: 'AIがもっともらしい文章を流暢に生成できるから',
      exp: '生成AIは説得力のある文章を容易に生成できるため、誤情報であってもあたかも事実のように見えます。',
      tag: '情報リテラシー', diff: 'medium'
    },
    {
      text: '他者が作成した文章をAIに学習させることに関して、注意すべき法律はどれですか？',
      opts: ['個人情報保護法のみ', '著作権法', '道路交通法', '学校教育法'],
      ans: '著作権法',
      exp: '他者の著作物をAIに学習させる際は著作権法に注意が必要です。',
      tag: '著作権・法律', diff: 'medium'
    },
    {
      text: '生成AIを使って作成したレポートを「自分の作品」として提出する行為について、最も適切な説明はどれですか？',
      opts: ['AIを使ったのだから著作権はAIにある', '全て自分が書いたように見せることは不正行為にあたる可能性がある', 'AIが手伝っても完全に自分の作品', '法律上問題ないため自由に提出できる'],
      ans: '全て自分が書いたように見せることは不正行為にあたる可能性がある',
      exp: 'AI生成コンテンツを自分の作品として提出することは、学術的不正行為に当たる可能性があります。',
      tag: '著作権・法律', diff: 'medium'
    },
    {
      text: '生成AIを使った「ブレインストーミング支援」として適切な活用例はどれですか？',
      opts: ['AIにレポート全文を書かせる', 'アイデアの候補を出させ、自分で取捨選択して深める', 'AIの回答をそのまま発表する', 'AIに答えを出させて終わる'],
      ans: 'アイデアの候補を出させ、自分で取捨選択して深める',
      exp: 'AIをブレインストーミングの出発点として使い、自分で考えを深める使い方は適切です。',
      tag: '学習活動', diff: 'easy'
    },
    {
      text: '外国語学習でのAI活用として最も教育的効果が高いものはどれですか？',
      opts: ['テスト問題をAIに解かせる', 'AIに自分の英作文を添削してもらい、修正理由を学ぶ', 'AIが書いた英文をそのまま提出する', '翻訳機能だけを使って文章を作る'],
      ans: 'AIに自分の英作文を添削してもらい、修正理由を学ぶ',
      exp: 'AI添削を受けながら修正理由を理解することで、文法や表現力の向上につながります。',
      tag: '学習活動', diff: 'easy'
    },
    {
      text: '生成AIを使って行ってはいけない活動として最も適切なものはどれですか？',
      opts: ['漢字の読み方を調べる', 'テストや入試の問題を解かせてそのまま答案とする', 'アイデアを出す補助にする', 'プレゼン原稿のアウトラインを作る'],
      ans: 'テストや入試の問題を解かせてそのまま答案とする',
      exp: 'テスト・試験でのAI利用は不正行為に当たります。',
      tag: '学習活動', diff: 'easy'
    },
    {
      text: '小学校低学年でのAI活用において特に注意すべき点はどれですか？',
      opts: ['漢字の勉強には使わない', 'AIの出力を批判的に評価する能力が発達途上のため、過度な依存に注意する', '算数の計算は全てAIに任せる', '読書感想文をAIに書かせる'],
      ans: 'AIの出力を批判的に評価する能力が発達途上のため、過度な依存に注意する',
      exp: '低学年の児童はAIの出力を批判的に評価する認知的能力が未発達です。',
      tag: '発達段階', diff: 'medium'
    },
    {
      text: '高等学校での生成AI活用の目標として最も適切なものはどれですか？',
      opts: ['全科目でAIを使わせる', 'AIを自律的・批判的に活用する力を育て、社会での活用に備える', '大学受験のためにAIを活用する', 'AIなしでは学習できない環境を作る'],
      ans: 'AIを自律的・批判的に活用する力を育て、社会での活用に備える',
      exp: '高等学校段階では将来の社会・職業生活を見据え、AIを自律的・批判的に活用できる能力を育てることが目標です。',
      tag: '発達段階', diff: 'easy'
    },
    {
      text: '学校が生成AI活用のルールを保護者に説明する際に最も重要な内容はどれですか？',
      opts: ['AIツールの価格', '活用の目的、個人情報の取り扱い、教育的効果と注意点', '他校の事例', 'AIの技術的仕組み'],
      ans: '活用の目的、個人情報の取り扱い、教育的効果と注意点',
      exp: '保護者への説明では、目的、個人情報の扱い、期待される効果と留意点を丁寧に伝えることが重要です。',
      tag: '学校運営', diff: 'medium'
    },
    {
      text: '学校での生成AI利用に関して、適切でない対応はどれですか？',
      opts: ['学校全体のルールを明確にして周知する', '児童生徒への規制なしに全面自由化する', '保護者への情報提供と同意取得を行う', '利用状況を定期的に評価し改善する'],
      ans: '児童生徒への規制なしに全面自由化する',
      exp: '生成AIの全面自由化は、発達段階への配慮や個人情報保護リスクを無視することになります。',
      tag: '学校運営', diff: 'easy'
    },
    {
      text: '「プロンプトエンジニアリング」とは何を指しますか？',
      opts: ['AIのプログラムを修正すること', 'AIへの指示文を工夫して望む出力を得るスキル', 'AIを使わないプログラミング技術', 'AIの設計図を作成すること'],
      ans: 'AIへの指示文を工夫して望む出力を得るスキル',
      exp: 'プロンプトエンジニアリングとはAIへの入力を適切に設計・工夫することで、より良い出力を得るスキルです。',
      tag: '基本原則', diff: 'medium'
    },
    {
      text: '生成AIの「バイアス」問題として最も適切な説明はどれですか？',
      opts: ['AIが計算を間違えること', '学習データに含まれる偏りがAI出力に反映される問題', 'AIの処理が遅くなること', 'AIが感情的な判断をすること'],
      ans: '学習データに含まれる偏りがAI出力に反映される問題',
      exp: 'AIは学習データの偏りを反映した出力をする場合があります。批判的な利用が重要です。',
      tag: '情報リテラシー', diff: 'hard'
    },
    {
      text: '文部科学省のガイドラインにおいて、生成AIを活用することで期待できる教育効果として挙げられているものはどれですか？',
      opts: ['教師が不要になる', '思考の外化を助け、対話的な学習を促進する', 'すべての学力が自動的に向上する', '宿題をする必要がなくなる'],
      ans: '思考の外化を助け、対話的な学習を促進する',
      exp: '生成AIは自分の考えを言語化するプロセスを支援し、AIとの対話を通じて思考を深める効果が期待できます。',
      tag: '基本原則', diff: 'medium'
    },
    {
      text: '生成AIが著作権法上の問題を引き起こす可能性がある場面として最も適切なものはどれですか？',
      opts: ['AI で天気を調べる', '既存の著作物に類似したコンテンツをAIで生成する', '計算問題をAIに解かせる', 'AIで辞書を引く'],
      ans: '既存の著作物に類似したコンテンツをAIで生成する',
      exp: '生成AIが既存著作物に類似したコンテンツを生成した場合、著作権侵害の可能性があります。',
      tag: '著作権・法律', diff: 'medium'
    },
    {
      text: 'プログラミング教育でAIを活用する際の適切な取り組みはどれですか？',
      opts: ['AIにすべてのコードを書かせる', 'AIが生成したコードを理解せずに提出する', 'AIで生成したコードを読み解き、仕組みを学ぶ', 'AIを使わずに全て手書きする'],
      ans: 'AIで生成したコードを読み解き、仕組みを学ぶ',
      exp: 'AIが生成したコードを読み解きながら仕組みを理解することで、プログラミング学習の深化につながります。',
      tag: '学習活動', diff: 'medium'
    },
    {
      text: '探究学習でAIを活用する適切な場面はどれですか？',
      opts: ['AIに探究テーマを決めてもらう', 'AIに結論を出してもらう', '情報収集の際に多様な視点を提示させ、批判的に検討する', 'AIのレポートをそのまま使う'],
      ans: '情報収集の際に多様な視点を提示させ、批判的に検討する',
      exp: '探究学習においてAIは多角的な視点を提示するツールとして有効です。批判的に吟味しながら自分の探究を深めることが重要です。',
      tag: '学習活動', diff: 'medium'
    },
    {
      text: '中学校段階でのAI活用で最も意識すべきことはどれですか？',
      opts: ['AIを使うことを厳しく制限する', '批判的思考力を育てながら、目的に応じた適切な活用を学ぶ', '大学入試に向けてAIに頼らない力をつける', 'AIの技術的な仕組みを詳しく学ぶ'],
      ans: '批判的思考力を育てながら、目的に応じた適切な活用を学ぶ',
      exp: '中学校段階は批判的思考力が発達する重要な時期です。AIを適切に活用する力を育てながら共存の姿勢を育むことが大切です。',
      tag: '発達段階', diff: 'medium'
    },
    {
      text: '発達障害のある生徒へのAI活用支援として適切なものはどれですか？',
      opts: ['障害のある生徒にはAIを使わせない', 'AIツールを合理的配慮の一つとして有効活用することを検討する', '全員同じ方法でAIを使わせる', 'AIは障害のある生徒には難しいので避ける'],
      ans: 'AIツールを合理的配慮の一つとして有効活用することを検討する',
      exp: 'AIツールは読み書きや文章表現に困難のある生徒への合理的配慮として有効な場合があります。',
      tag: '発達段階', diff: 'medium'
    },
    {
      text: '教職員の生成AI研修で重点的に扱うべき内容として適切なものはどれですか？',
      opts: ['最新AIツールの操作方法のみ', 'AIの特性・限界の理解、教育的活用法、個人情報保護の注意点', 'AIでできる管理業務の効率化のみ', 'AIを使わない授業方法'],
      ans: 'AIの特性・限界の理解、教育的活用法、個人情報保護の注意点',
      exp: '教職員研修では技術操作だけでなく、AIの特性・限界の理解と個人情報保護の重要性をセットで学ぶ必要があります。',
      tag: '学校運営', diff: 'medium'
    },
    {
      text: 'AIを活用した「教師の業務効率化」として適切なものはどれですか？',
      opts: ['AIに通知表の所見を全て書かせてそのまま使う', 'AIで文書のたたき台を作成し、教師が確認・修正して最終化する', 'AIが作成した書類を未確認で送付する', '採点をすべてAIに任せて結果だけを見る'],
      ans: 'AIで文書のたたき台を作成し、教師が確認・修正して最終化する',
      exp: 'AIを業務効率化に使う際も、必ず人間が最終確認・判断を行うことが重要です。',
      tag: '学校運営', diff: 'medium'
    },
    {
      text: '学校が生成AI活用のルールを定める際、最初に確認すべきことは何ですか？',
      opts: ['最新のAIツールを導入すること', '設置者（教育委員会等）の方針を確認すること', '保護者の同意を得ること', '他校の事例を参考にすること'],
      ans: '設置者（教育委員会等）の方針を確認すること',
      exp: '学校は設置者の方針を踏まえた上でルールを策定することが重要です。',
      tag: '学校運営', diff: 'medium'
    },
    {
      text: '文科省ガイドラインにおいて、生成AI利用が特に慎重であるべき場面として挙げられているものはどれですか？',
      opts: ['調べ学習の補助として使う場合', '読書感想文や詩の創作など、学習の根幹をなす活動', 'プレゼンテーションの構成を考える場合', '外国語の翻訳の確認をする場合'],
      ans: '読書感想文や詩の創作など、学習の根幹をなす活動',
      exp: '読書感想文や詩の創作などは思考・表現力の育成が目的の根幹的な学習活動です。AIに代替させることは学習効果を損ないます。',
      tag: '学習活動', diff: 'medium'
    },
    {
      text: '「AIリテラシー」として児童生徒に身につけさせるべき能力として最も適切なものはどれですか？',
      opts: ['AIをできるだけ使わない能力', 'AIの出力を批判的に評価し、適切に活用する能力', 'AIプログラムを作成する能力', 'AIに頼らず自力で問題を解く能力'],
      ans: 'AIの出力を批判的に評価し、適切に活用する能力',
      exp: 'AIリテラシーとは、AIの仕組みを理解し、出力を批判的に評価しながら適切に活用できる能力を指します。',
      tag: '情報リテラシー', diff: 'easy'
    },
    {
      text: '学校での生成AI活用において「デジタル・シティズンシップ」教育として取り扱うべき内容はどれですか？',
      opts: ['AIの使い方の技術的な説明のみ', 'AI技術の仕組みの詳細', 'AI利用に伴う倫理的責任、情報の真偽確認、プライバシー保護', 'AIゲームの遊び方'],
      ans: 'AI利用に伴う倫理的責任、情報の真偽確認、プライバシー保護',
      exp: 'デジタル・シティズンシップ教育においてAI利用は倫理的責任、批判的情報評価、プライバシー保護などを総合的に扱う重要なテーマです。',
      tag: '情報リテラシー', diff: 'medium'
    },
    {
      text: '学校のICT担当教員がAIツール導入を検討する際、最初に確認すべき事項として適切なものはどれですか？',
      opts: ['ツールの無料機能の充実度', '教育的目的との整合性と児童生徒の年齢に応じた適切性', '他校での導入実績の数', 'デザインの見やすさ'],
      ans: '教育的目的との整合性と児童生徒の年齢に応じた適切性',
      exp: 'AIツールの導入前には教育目的との整合性と発達段階に応じた適切性を最優先に確認することが重要です。',
      tag: '学校運営', diff: 'medium'
    },
    {
      text: '生成AIを活用した「個別最適な学び」について最も適切な説明はどれですか？',
      opts: ['全ての生徒に同じAIコンテンツを提供する', 'AIが学習の進捗に応じた問題や解説を提供し、個々の理解を深める', 'AIが生徒の代わりに学習する', '教師がAIを使って同一の授業を繰り返す'],
      ans: 'AIが学習の進捗に応じた問題や解説を提供し、個々の理解を深める',
      exp: '生成AIは各生徒の学習状況に合わせた問題や解説を提供することで個別最適な学びを支援できます。',
      tag: '学習活動', diff: 'medium'
    },
  ]

  for (const q of questions) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO ai_kentei_questions (question_text, options, correct_answer, explanation, tag, difficulty, status, reviewed_by_human)
       VALUES ($1, $2::jsonb, $3, $4, $5, $6, 'published', true)`,
      q.text,
      JSON.stringify(q.opts),
      q.ans,
      q.exp,
      q.tag,
      q.diff
    )
  }
}
