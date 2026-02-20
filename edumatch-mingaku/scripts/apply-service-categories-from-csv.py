#!/usr/bin/env python3
"""
CSV（WooCommerce商品エクスポート）の「名前」「カテゴリー」を読み、
Supabase の Service テーブルの title と照合して category を一括更新する。

使い方:
  DIRECT_URL="postgresql://..." python3 scripts/apply-service-categories-from-csv.py /path/to/wc-product-export-*.csv
"""
import csv
import os
import re
import sys

try:
    import psycopg2
except ImportError:
    print("pip install psycopg2-binary", file=sys.stderr)
    sys.exit(1)

# アプリで定義しているサービスカテゴリ（先頭一致・部分一致でマッピング）
SERVICE_CATEGORIES = [
    "AI活用",
    "保護者連絡",
    "生徒管理",
    "生徒集客",
    "英会話",
    "映像授業",
    "問題演習",
    "学習管理システム(LMS)",
    "質問対応",
    "プログラミング",
    "探求・キャリア教育/総合型選抜対策",
    "オンライン授業支援",
    "家庭学習支援",
    "知育/能力開発/幼児教育",
    "講師採用/育成/研修",
    "デバイス・ハードウェア・ICT環境構築",
    "コンサル/フランチャイズ/M&A",
    "助成金・補助金支援",
    "その他管理/代行",
]

# CSV のカテゴリ表記 → 上記のいずれかに正規化（全角括弧など）
def normalize_csv_cat(s: str) -> str:
    s = s.strip()
    # 階層 "〇〇 > △△" の場合は左側だけ使う
    if " > " in s:
        s = s.split(" > ")[0].strip()
    # 全角括弧を半角に（学習管理システム（LMS）→ 学習管理システム(LMS)）
    s = s.replace("（", "(").replace("）", ")")
    return s


def csv_category_to_app_category(csv_category_cell: str) -> str:
    """CSV の「カテゴリー」列（カンマ区切り）から、アプリの1カテゴリを1つ選ぶ。"""
    if not csv_category_cell or not csv_category_cell.strip():
        return "その他管理/代行"
    parts = [normalize_csv_cat(p) for p in csv_category_cell.split(",")]
    for p in parts:
        if not p:
            continue
        for app_cat in SERVICE_CATEGORIES:
            # 完全一致 or CSV側がアプリのカテゴリで始まる
            if p == app_cat or app_cat in p or p in app_cat:
                return app_cat
        # 表記ゆれ: 学習管理システム（LMS）は上で normalize 済み
        if "学習管理システム" in p and "LMS" in p:
            return "学習管理システム(LMS)"
    return "その他管理/代行"


def load_env():
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env.local")
    if os.path.isfile(env_path):
        with open(env_path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                v = v.strip().strip('"').strip("'")
                if k == "DIRECT_URL" and v:
                    os.environ.setdefault("DIRECT_URL", v)
                    break


def main():
    if len(sys.argv) < 2:
        print("Usage: DIRECT_URL=... python3 scripts/apply-service-categories-from-csv.py <csv_path>", file=sys.stderr)
        sys.exit(1)
    load_env()
    csv_path = sys.argv[1]
    db_url = os.environ.get("DIRECT_URL")
    if not db_url:
        print("DIRECT_URL is not set. Set it or add to .env.local", file=sys.stderr)
        sys.exit(1)

    # CSV 読み込み（BOM・クォート対応）
    rows_by_name = {}
    with open(csv_path, encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = (row.get("名前") or "").strip()
            if not name:
                continue
            cat_cell = row.get("カテゴリー") or ""
            app_cat = csv_category_to_app_category(cat_cell)
            rows_by_name[name] = app_cat

    print(f"CSV: {len(rows_by_name)} 件の名前・カテゴリを読み込みました。")

    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    cur = conn.cursor()

    cur.execute('SELECT id, title FROM "Service"')
    services = cur.fetchall()
    print(f"DB: {len(services)} 件のサービスを取得しました。")

    updated = 0
    not_found = []
    for service_id, title in services:
        title_clean = (title or "").strip()
        if not title_clean:
            continue
        # 完全一致
        if title_clean in rows_by_name:
            new_cat = rows_by_name[title_clean]
            cur.execute('UPDATE "Service" SET category = %s WHERE id = %s', (new_cat, service_id))
            updated += 1
            print(f"  [完全一致] {title_clean[:50]} -> {new_cat}")
            continue
        # 部分一致（CSVの名前が DB の title に含まれる / DB の title が CSV の名前で始まる）
        matched = None
        for csv_name, new_cat in rows_by_name.items():
            if csv_name in title_clean or title_clean in csv_name:
                matched = new_cat
                break
            # 括弧前だけ比較（例: "aim@（エイムアット）" vs "aim@（エイムアット）"）
            csv_base = re.sub(r"[（(].*?[）)]", "", csv_name).strip()
            title_base = re.sub(r"[（(].*?[）)]", "", title_clean).strip()
            if csv_base and title_base and (csv_base in title_base or title_base in csv_base):
                matched = new_cat
                break
        if matched is not None:
            cur.execute('UPDATE "Service" SET category = %s WHERE id = %s', (matched, service_id))
            updated += 1
            print(f"  [部分一致] {title_clean[:50]} -> {matched}")
        else:
            not_found.append(title_clean[:60])

    print(f"\n更新: {updated} 件")
    if not_found:
        print(f"CSVに名前が無かったサービス: {len(not_found)} 件")
        for t in not_found[:20]:
            print(f"  - {t}")
        if len(not_found) > 20:
            print(f"  ... 他 {len(not_found) - 20} 件")

    cur.close()
    conn.close()


if __name__ == "__main__":
    main()
