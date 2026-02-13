# EduMatch リポジトリの作成手順

## 1. GitHub でリポジトリを作成

1. 以下のリンクを開き、**Edu-match** アカウントでログインしてください。
   - **https://github.com/new?name=EduMatch**

2. 設定は次のようにしてください。
   - **Repository name**: `EduMatch`（そのまま）
   - **Description**: 任意
   - **Public** を選択
   - **「Add a README file」にチェックを入れない**（空のリポジトリにする）
   - **「Add .gitignore」は選ばない**
   - **「Choose a license」は選ばない**

3. **「Create repository」** をクリックして作成します。

## 2. プッシュする

リポジトリを作成したら、ターミナルで以下を実行してください。

```bash
cd /Users/Ryo/EduMatch/EduMatch
git push -u origin main
```

初回は GitHub のログイン（edumatch.kanri@gmail.com）を求められます。

---

※ リモートはすでに `https://github.com/Edu-match/EduMatch.git` に設定済みです。
