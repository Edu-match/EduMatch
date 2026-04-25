import { PrismaClient, Role } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 シードデータの投入を開始します...");

  // 既存のデータを削除（開発環境用）
  // 外部キー制約のため、ViewHistoryを先に削除
  await prisma.viewHistory.deleteMany();
  await prisma.post.deleteMany();
  await prisma.service.deleteMany();
  await prisma.profile.deleteMany();

  console.log("📝 既存データを削除しました");

  // プロバイダー（企業）用のプロファイルを作成
  const providers = [
    {
      id: randomUUID(),
      name: "株式会社エデュテック",
      email: "info@edutech.example.com",
      role: Role.VIEWER,
      avatar_url: "https://placehold.co/100x100/e0f2fe/0369a1?text=ET",
      subscription_status: "ACTIVE",
    },
    {
      id: randomUUID(),
      name: "スマートスクール株式会社",
      email: "contact@smartschool.example.com",
      role: Role.VIEWER,
      avatar_url: "https://placehold.co/100x100/fef3c7/ca8a04?text=SS",
      subscription_status: "ACTIVE",
    },
    {
      id: randomUUID(),
      name: "ラーニングテック合同会社",
      email: "hello@learningtech.example.com",
      role: Role.VIEWER,
      avatar_url: "https://placehold.co/100x100/d9f99d/65a30d?text=LT",
      subscription_status: "ACTIVE",
    },
    {
      id: randomUUID(),
      name: "デジタル教育研究所",
      email: "support@digital-edu.example.com",
      role: Role.VIEWER,
      avatar_url: "https://placehold.co/100x100/fed7aa/ea580c?text=DE",
      subscription_status: "ACTIVE",
    },
    {
      id: randomUUID(),
      name: "次世代学習システム株式会社",
      email: "info@nextgen-learn.example.com",
      role: Role.VIEWER,
      avatar_url: "https://placehold.co/100x100/bfdbfe/2563eb?text=NL",
      subscription_status: "ACTIVE",
    },
  ];

  for (const provider of providers) {
    await prisma.profile.create({ data: provider });
    await prisma.corporateProfile.create({
      data: {
        id: provider.id,
        organization: provider.name,
      },
    });
  }
  console.log(`✅ ${providers.length}件のプロファイルを作成しました`);

  // サービスデータを作成
  const services = [
    {
      provider_id: providers[0].id,
      title: "ClassTech Pro - 授業管理と学習進捗の一元管理",
      description: "授業管理から生徒の学習進捗追跡まで、教育現場のあらゆるニーズに応えるオールインワンプラットフォーム。",
      content: `
## ClassTech Proの特徴

ClassTech Proは、教育現場のデジタル化を加速させる統合プラットフォームです。

### 主な機能

1. **授業管理**
   - 授業計画の作成・共有
   - 教材のデジタル配信
   - リアルタイム出席管理

2. **学習進捗追跡**
   - 個別学習状況の可視化
   - AIによる学習提案
   - 保護者向けレポート自動生成

3. **コミュニケーション**
   - チャット機能
   - お知らせ配信
   - 個別相談予約

### 導入実績

全国500校以上の学校で導入されています。
      `,
      thumbnail_url: "https://placehold.co/400x300/e0f2fe/0369a1?text=ClassTech",
      category: "授業管理",
      price_info: "月額30,000円〜（生徒数による従量課金）",
      is_published: true,
    },
    {
      provider_id: providers[1].id,
      title: "EduCollabo - 学校と保護者のコミュニケーションツール",
      description: "学校からのお知らせ配信、保護者との連絡、出欠確認をスマートに。",
      content: `
## EduCollaboで実現する新しいコミュニケーション

保護者との連携をスムーズにする機能が充実。

### 主な機能

- 一斉メール・プッシュ通知
- 欠席連絡のオンライン受付
- 行事予定のカレンダー共有
- アンケート機能
- 緊急連絡網

### セキュリティ

- 個人情報の暗号化
- 二要素認証対応
- ISMS認証取得済み
      `,
      thumbnail_url: "https://placehold.co/400x300/fef3c7/ca8a04?text=EduCollabo",
      category: "コミュニケーション",
      price_info: "月額20,000円〜",
      is_published: true,
    },
    {
      provider_id: providers[2].id,
      title: "SmartAssess - AIを活用した自動採点システム",
      description: "AIが記述問題も含めて自動採点。教師の負担を大幅に軽減します。",
      content: `
## SmartAssessの革新的な採点システム

AIテクノロジーで採点業務を効率化。

### 特徴

1. **記述問題の自動採点**
   - 自然言語処理による評価
   - 部分点の自動算出
   - 模範解答との比較分析

2. **学習分析**
   - 弱点の自動検出
   - 個別フィードバック生成
   - クラス全体の傾向分析

3. **連携機能**
   - 主要LMSとの連携
   - Excel/CSV出力
   - 成績管理システム連携
      `,
      thumbnail_url: "https://placehold.co/400x300/d9f99d/65a30d?text=SmartAssess",
      category: "評価・テスト",
      price_info: "月額15,000円〜（テスト回数による従量課金）",
      is_published: true,
    },
    {
      provider_id: providers[3].id,
      title: "LearnSpace - オンライン・オフライン統合学習プラットフォーム",
      description: "対面授業とオンライン学習をシームレスに統合する次世代学習環境。",
      content: `
## LearnSpaceが提供する新しい学習体験

ハイブリッド学習を最大限に活用するプラットフォーム。

### 機能一覧

- ビデオ会議システム内蔵
- 録画・再生機能
- インタラクティブホワイトボード
- グループワークスペース
- 教材ライブラリ

### 対応デバイス

- Windows / Mac
- iPad / Android タブレット
- Chromebook
      `,
      thumbnail_url: "https://placehold.co/400x300/fed7aa/ea580c?text=LearnSpace",
      category: "LMS",
      price_info: "年額300,000円〜",
      is_published: true,
    },
    {
      provider_id: providers[4].id,
      title: "TeamEdu - 協働学習支援プラットフォーム",
      description: "グループワークやプロジェクト学習を効果的にサポート。",
      content: `
## TeamEduで実現する協働学習

生徒同士の学び合いを促進するツール群。

### 主な機能

- プロジェクト管理ボード
- 共同編集ドキュメント
- ディスカッションフォーラム
- ピアレビュー機能
- 成果物ポートフォリオ

### 教育効果

- 主体的・対話的で深い学びの実現
- 21世紀型スキルの育成
- 探究学習のサポート
      `,
      thumbnail_url: "https://placehold.co/400x300/bfdbfe/2563eb?text=TeamEdu",
      category: "協働学習",
      price_info: "月額10,000円〜",
      is_published: true,
    },
    {
      provider_id: providers[0].id,
      title: "DataInsight Edu - 教育データ分析ダッシュボード",
      description: "学習データを可視化し、データドリブンな教育改善を支援。",
      content: `
## DataInsight Eduの分析力

教育ビッグデータを活用した意思決定支援。

### 分析機能

- 学力推移の可視化
- 出席・遅刻パターン分析
- 学習時間と成績の相関分析
- 中退リスク予測
- カリキュラム効果測定
      `,
      thumbnail_url: "https://placehold.co/400x300/e9d5ff/9333ea?text=DataInsight",
      category: "データ分析",
      price_info: "月額50,000円〜",
      is_published: true,
    },
    {
      provider_id: providers[1].id,
      title: "SecureEdu - 学校向けセキュリティソリューション",
      description: "教育機関特化のサイバーセキュリティ対策サービス。",
      content: `
## SecureEduで守る学校のセキュリティ

教育現場に特化したセキュリティサービス。

### サービス内容

- ネットワーク監視
- 不正アクセス検知
- フィルタリング
- 情報漏洩対策
- セキュリティ研修
      `,
      thumbnail_url: "https://placehold.co/400x300/fecaca/dc2626?text=SecureEdu",
      category: "セキュリティ",
      price_info: "月額25,000円〜",
      is_published: true,
    },
    {
      provider_id: providers[2].id,
      title: "AdaptiveLearn - 個別最適化学習エンジン",
      description: "AIが一人ひとりに最適な学習コンテンツを自動提案。",
      content: `
## AdaptiveLearnの適応学習

個別最適化された学習体験を提供。

### AI機能

- 学習スタイル診断
- 難易度自動調整
- 復習タイミング最適化
- モチベーション分析
- 目標達成予測
      `,
      thumbnail_url: "https://placehold.co/400x300/f0f9ff/0284c7?text=Adaptive",
      category: "AI学習",
      price_info: "生徒1人あたり月額500円〜",
      is_published: true,
    },
    {
      provider_id: providers[3].id,
      title: "VideoLearn Pro - 動画教材作成プラットフォーム",
      description: "YouTube動画を活用した効果的な教材作成をサポート。",
      content: `
## VideoLearn Proの特徴

動画を活用した教育コンテンツ作成をサポートします。

https://www.youtube.com/watch?v=jNQXAC9IVRw

上の動画は、教育現場での動画活用事例を紹介しています。

### 主な機能

- YouTube動画の簡単埋め込み
- タイムスタンプ付きメモ機能
- 小テスト挿入機能
- 視聴データ分析

### 活用シーン

- 反転授業の事前学習
- 補習教材として
- 家庭学習のサポート
      `,
      thumbnail_url: "https://placehold.co/400x300/fce7f3/db2777?text=VideoLearn",
      youtube_url: "https://www.youtube.com/watch?v=jNQXAC9IVRw",
      category: "教材作成",
      price_info: "月額15,000円〜",
      is_published: true,
    },
  ];

  for (const service of services) {
    await prisma.service.create({ data: service });
  }
  console.log(`✅ ${services.length}件のサービスを作成しました`);

  // 記事（Post）データを作成
  const posts = [
    {
      provider_id: providers[0].id,
      title: "2024年度、教育現場で注目のICTツール5選を徹底解説",
      category: "教育ICT",
      tags: ["EdTech", "ICTツール", "2024年度"],
      summary: "2024年度に特に注目すべき教育ICTツール5選を紹介。AI学習管理、クラウド校務支援、VR/AR教材など、最新のテクノロジーを活用した教育改革の実践方法を解説します。",
      content: `
## はじめに

2024年度も教育ICTの進化は止まりません。今回は特に注目すべき5つのツールを紹介します。

## 1. AI搭載型学習管理システム

AIを活用した個別最適化学習が主流になりつつあります...

## 2. クラウド型校務支援システム

教職員の働き方改革を支援するクラウドサービスが増加しています...

## 3. VR/AR教材

没入感のある学習体験を提供するVR/AR技術が教育現場に浸透し始めています...

## 4. デジタル教科書プラットフォーム

2024年度からの本格導入に向けて、各社のサービスが出揃いました...

## 5. 保護者連携アプリ

学校と家庭をつなぐコミュニケーションツールの需要が高まっています...

## まとめ

これらのツールを効果的に組み合わせることで、教育の質を大きく向上させることができます。
      `,
      thumbnail_url: "https://placehold.co/800x450/e0f2fe/0369a1?text=ICT2024",
      view_count: 12500,
      is_published: true,
    },
    {
      provider_id: providers[1].id,
      title: "GIGAスクール構想の最新動向と今後の展望",
      category: "政策・制度",
      tags: ["GIGAスクール", "文部科学省", "1人1台端末"],
      summary: "GIGAスクール構想の現状と今後の展望を徹底解説。全国の成功事例、直面する課題と対策、2025年度以降のロードマップまで、最新の動向をお届けします。",
      content: `
## GIGAスクール構想の現状

全国の小中学校への1人1台端末整備が完了し、活用フェーズに移行しています。

## 成功事例

### A市の事例
端末を活用した協働学習により、学力向上を実現...

### B県の取り組み
クラウドを活用した教材共有で、教員の負担軽減を達成...

## 課題と対策

- ネットワーク環境の改善
- 教員のICTスキル向上
- 家庭での活用促進

## 今後の展望

2025年度以降に向けた次のステップとは...
      `,
      thumbnail_url: "https://placehold.co/800x450/fef3c7/ca8a04?text=GIGA",
      view_count: 9800,
      is_published: true,
    },
    {
      provider_id: providers[2].id,
      title: "オンライン授業を効果的にする3つのポイント",
      category: "教育ICT",
      tags: ["オンライン授業", "遠隔教育", "授業改善"],
      summary: "オンライン授業を成功させる3つの重要ポイントを解説。インタラクティブな要素、適切なツール選択、評価方法の工夫など、実践的なノウハウをお伝えします。",
      content: `
## オンライン授業の課題

対面授業とは異なる工夫が必要です。

## ポイント1: インタラクティブな要素を取り入れる

一方的な講義形式では生徒の集中力が続きません...

## ポイント2: 適切なツールの選択

目的に応じたツール選びが重要です...

## ポイント3: 評価方法の工夫

オンラインでも適切に学習成果を評価する方法...

## 実践例

実際に成果を上げている学校の取り組みを紹介します...
      `,
      thumbnail_url: "https://placehold.co/800x450/d9f99d/65a30d?text=Online",
      view_count: 8500,
      is_published: true,
    },
    {
      provider_id: providers[3].id,
      title: "小学校プログラミング教育の実践例",
      category: "教育ICT",
      tags: ["プログラミング", "Scratch", "小学校"],
      summary: "2020年度から必修化された小学校プログラミング教育の実践例を紹介。算数・理科との教科横断的な取り組みや、Scratch、micro:bitなどの具体的なツール活用法を解説します。",
      content: `
## プログラミング教育の必修化

2020年度から小学校でプログラミング教育が必修化されました。

## 教科横断的な取り組み

### 算数との連携
正多角形の描画をプログラミングで学ぶ...

### 理科との連携
センサーを使った実験データの収集と分析...

## 使用ツール

- Scratch
- Viscuit
- micro:bit

## 評価の観点

プログラミング的思考をどう評価するか...
      `,
      thumbnail_url: "https://placehold.co/800x450/fed7aa/ea580c?text=Programming",
      view_count: 7200,
      is_published: true,
    },
    {
      provider_id: providers[4].id,
      title: "EdTechツール選びの完全ガイド",
      category: "教育ICT",
      tags: ["EdTech", "ツール選定", "導入ガイド"],
      summary: "EdTechツール選定の完全ガイド。費用対効果、使いやすさ、サポート体制、セキュリティなど、4つの重要な選定ポイントとトライアル活用法を詳しく解説します。",
      content: `
## EdTechツール導入の前に

導入目的を明確にすることが成功の鍵です。

## 選定のポイント

1. **費用対効果**
   初期費用とランニングコストを総合的に評価...

2. **使いやすさ**
   教員・生徒双方の視点でUIを確認...

3. **サポート体制**
   導入後のサポートが充実しているか...

4. **セキュリティ**
   個人情報保護の観点から確認すべき項目...

## 比較検討の方法

トライアル期間を活用した効果的な評価方法...
      `,
      thumbnail_url: "https://placehold.co/800x450/bfdbfe/2563eb?text=EdTech",
      view_count: 6500,
      is_published: true,
    },
    {
      provider_id: providers[0].id,
      title: "学校DX推進のためのステップ",
      category: "教育ICT",
      tags: ["DX", "デジタル化", "学校改革"],
      summary: "学校のデジタルトランスフォーメーション（DX）を推進するための5つのステップを解説。現状分析からビジョン策定、ツール選定、研修、評価・改善まで、実践的な手順を紹介します。",
      content: `
## 学校DXとは

教育のデジタルトランスフォーメーションについて解説します。

## 推進のステップ

### Step 1: 現状分析
ICT環境と活用状況の把握...

### Step 2: ビジョン策定
目指すべき姿を明確に...

### Step 3: ツール選定
必要なシステムの導入...

### Step 4: 研修実施
教職員のスキルアップ...

### Step 5: 評価・改善
PDCAサイクルの実践...
      `,
      thumbnail_url: "https://placehold.co/800x450/e9d5ff/9333ea?text=DX",
      view_count: 5800,
      is_published: true,
    },
    {
      provider_id: providers[1].id,
      title: "保護者とのコミュニケーション改善術",
      category: "学校運営",
      tags: ["保護者連携", "コミュニケーション", "ICT活用"],
      summary: "デジタルツールを活用した保護者との効果的なコミュニケーション方法を紹介。配信タイミングの工夫、双方向コミュニケーションの促進など、実践的な改善術をお届けします。",
      content: `
## デジタルツールで変わる保護者連携

従来の紙ベースからの移行で得られるメリット。

## 成功のポイント

- 配信タイミングの工夫
- 読みやすい文章構成
- 双方向コミュニケーションの促進

## 導入事例

C小学校での取り組みと成果を紹介...
      `,
      thumbnail_url: "https://placehold.co/800x450/fecaca/dc2626?text=Parent",
      view_count: 5200,
      is_published: true,
    },
    {
      provider_id: providers[2].id,
      title: "クラウド活用で実現する働き方改革",
      category: "学校運営",
      tags: ["働き方改革", "クラウド", "業務効率化"],
      summary: "教員の働き方改革を支援するクラウドツールの活用方法を紹介。長時間労働の削減、業務の効率化、ワークライフバランスの改善につながる実践例を解説します。",
      content: `
## 教員の働き方改革

長時間労働が課題となっている教育現場での改革事例。

## クラウドサービスの活用

- 教材の共有と再利用
- 成績処理の効率化
- 会議のオンライン化

## 効果測定

導入前後での業務時間の変化を数値で紹介...
      `,
      thumbnail_url: "https://placehold.co/800x450/f0f9ff/0284c7?text=Cloud",
      view_count: 4800,
      is_published: true,
    },
    {
      provider_id: providers[3].id,
      title: "データドリブンな教育改善の実践",
      category: "教育ICT",
      tags: ["データ分析", "教育改善", "学習データ"],
      summary: "学習データを活用した教育改善の実践方法を解説。データ収集のポイント、分析手法、プライバシー配慮など、データドリブンな教育実践の具体的なアプローチを紹介します。",
      content: `
## 教育データの活用

学習データを分析して教育改善に活かす方法。

## データ収集のポイント

どのようなデータを、どのように収集するか...

## 分析手法

基本的な統計分析から機械学習の活用まで...

## プライバシーへの配慮

個人情報保護とデータ活用のバランス...
      `,
      thumbnail_url: "https://placehold.co/800x450/fff7ed/f59e0b?text=Data",
      view_count: 4200,
      is_published: true,
    },
    {
      provider_id: providers[4].id,
      title: "セキュリティ対策のベストプラクティス",
      category: "学校運営",
      tags: ["セキュリティ", "情報モラル", "サイバー攻撃対策"],
      summary: "教育機関におけるセキュリティ対策の実践ガイド。パスワード管理、ソフトウェア更新、バックアップなどの基本対策から、児童生徒への情報モラル教育まで網羅的に解説します。",
      content: `
## 教育機関を狙うサイバー攻撃

近年増加しているセキュリティインシデントの実態。

## 対策の基本

- パスワード管理
- ソフトウェアの更新
- バックアップの実施

## 児童生徒への情報モラル教育

セキュリティ意識を高める取り組み...
      `,
      thumbnail_url: "https://placehold.co/800x450/fee2e2/b91c1c?text=Security",
      view_count: 3800,
      is_published: true,
    },
    {
      provider_id: providers[0].id,
      title: "YouTube動画で学ぶ教育ICT活用術",
      category: "教育ICT",
      tags: ["YouTube", "動画教材", "ICT活用"],
      summary: "YouTube動画を活用した教育ICT実践方法を紹介。動画埋め込み機能の使い方、効果的な動画教材の作成方法、レスポンシブ対応など、実践的なノウハウを解説します。",
      content: `
## YouTube動画埋め込みテスト

この記事では、YouTube動画の埋め込み機能をテストします。

https://www.youtube.com/watch?v=dQw4w9WgXcQ

上の動画が正しく埋め込まれて表示されることを確認します。

## 確認ポイント

- 動画プレイヤーが表示されるか
- 再生ボタンが機能するか
- レスポンシブ対応しているか

## 追加のテキストコンテンツ

動画の後にもテキストが正しく表示されることを確認します。
      `,
      thumbnail_url: "https://placehold.co/800x450/dbeafe/3b82f6?text=YouTube",
      youtube_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      view_count: 0,
      is_published: true,
    },
  ];

  for (const post of posts) {
    await prisma.post.create({ data: post });
  }
  console.log(`✅ ${posts.length}件の記事を作成しました`);

  // フォーラム部屋（6部屋）の初期データ
  const forumRooms = [
    {
      id: "ai-dx",
      name: "教育AI・DX",
      description: "生成AI活用、EdTech、デジタル化の実践や課題を語り合う場",
      emoji: "🤖",
      weekly_topic: "生成AIを授業で使ってみた——成功・失敗の体験談を聞かせてください",
      ai_discussion: true,
    },
    {
      id: "steam",
      name: "探究・STEAM",
      description: "探究学習・プロジェクト型・STEAM教育の実践を共有",
      emoji: "🔬",
      weekly_topic: "「探究がうまくいかない」よくある失敗パターンと打開策は？",
      ai_discussion: false,
    },
    {
      id: "management",
      name: "学校経営・働き方",
      description: "管理職・ミドルリーダーの悩み、働き方改革、組織づくりを議論",
      emoji: "🏫",
      weekly_topic: "残業削減に本当に効果があった施策——現場の声を集めます",
      ai_discussion: false,
    },
    {
      id: "policy",
      name: "教育政策・制度",
      description: "新学習指導要領・入試改革・教員免許更新など制度の読み解き",
      emoji: "📜",
      weekly_topic: "「高校情報科」必修化——現場はどう変わった？変わっていない？",
      ai_discussion: false,
    },
    {
      id: "diversity",
      name: "多様な学び・支援",
      description: "不登校・特別支援・インクルーシブ教育・フリースクールなど",
      emoji: "🌈",
      weekly_topic: "通常学級での発達特性のある子どもへのサポート——何が一番難しい？",
      ai_discussion: false,
    },
    {
      id: "global",
      name: "国際・海外教育",
      description: "海外教育事情・国際バカロレア・留学・グローバル人材育成",
      emoji: "🌏",
      weekly_topic: "日本とフィンランド、教育の「違い」を実感した瞬間は？",
      ai_discussion: false,
    },
  ];

  for (const room of forumRooms) {
    await prisma.forumRoom.upsert({
      where: { id: room.id },
      update: {},
      create: room,
    });
  }
  console.log(`✅ ${forumRooms.length}件のフォーラム部屋を作成しました`);

  console.log("🎉 シードデータの投入が完了しました！");
}

main()
  .catch((e) => {
    console.error("❌ シードデータの投入に失敗しました:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
