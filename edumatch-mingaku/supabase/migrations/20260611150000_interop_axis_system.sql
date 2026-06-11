-- トップマップ2軸分布のAI自動更新用テーブル。
-- interop_axis_config: 軸の定義（1行のみ）。週次cronでLLMが再評価し上書き。
-- interop_topic_position: 各トピックの座標(x,y)。日次cronでLLMが再計算し上書き。
-- 初期値は内容ベースの手動設定（フロントの DEFAULT_TOPIC_AXIS と一致）。

CREATE TABLE IF NOT EXISTS interop_axis_config (
  id         smallint PRIMARY KEY DEFAULT 1,
  x_left     text NOT NULL DEFAULT '人間・関係',
  x_right    text NOT NULL DEFAULT '技術・データ',
  y_top      text NOT NULL DEFAULT '制度・政策',
  y_bottom   text NOT NULL DEFAULT '現場・実践',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT interop_axis_single_row CHECK (id = 1)
);
INSERT INTO interop_axis_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS interop_topic_position (
  topic_no   integer PRIMARY KEY,
  x          double precision NOT NULL DEFAULT 0,
  y          double precision NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO interop_topic_position (topic_no, x, y) VALUES
  (3, 0.72, -0.38), (7, 0.58, 0.34), (9, 0.5, -0.28), (10, 0.62, -0.52),
  (14, -0.32, -0.42), (17, -0.42, -0.5), (19, -0.18, 0.82), (20, -0.6, -0.3),
  (21, -0.5, 0.42), (22, -0.72, -0.18), (23, -0.78, -0.34), (25, 0.28, -0.28),
  (31, -0.62, 0.34), (32, -0.66, -0.12), (41, -0.3, 0.72), (46, -0.14, 0.88),
  (51, -0.42, -0.52), (52, 0.22, -0.58), (53, 0.36, -0.5), (54, -0.3, -0.46),
  (55, 0.3, -0.5), (56, -0.72, -0.5), (57, -0.5, -0.62), (58, -0.6, -0.56),
  (59, 0.26, -0.62), (60, -0.2, -0.44), (61, 0.82, -0.34), (62, -0.3, -0.36)
ON CONFLICT (topic_no) DO NOTHING;
