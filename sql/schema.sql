-- M2 建库：7 张表 + 1 视图。可重复执行（IF NOT EXISTS / OR REPLACE）。
-- 字段以 docs/数据库设计说明书.md §3 为准。

CREATE TABLE IF NOT EXISTS announcements (
  id               BIGSERIAL PRIMARY KEY,
  site_code        TEXT NOT NULL DEFAULT 'sh-zfcg',
  article_id       TEXT NOT NULL,
  category_code    TEXT NOT NULL,
  type             TEXT NOT NULL,
  type_detail      TEXT,
  title            TEXT NOT NULL,
  purchaser        TEXT,
  publisher        TEXT,
  district_name    TEXT,
  district_code    TEXT,
  publish_time     TIMESTAMPTZ NOT NULL,
  expired_at       TIMESTAMPTZ,
  project_code     TEXT,
  project_name     TEXT,
  bid_open_time    TIMESTAMPTZ,
  fund_source      TEXT,
  budget_amount    NUMERIC(18,2),
  award_amount     NUMERIC(18,2),
  supplier         TEXT,
  content_html     TEXT,
  content_text     TEXT,
  attachment_info  JSONB,
  track_links      JSONB,
  tags             JSONB NOT NULL DEFAULT '{}',
  raw_json         JSONB,
  detail_status    TEXT NOT NULL DEFAULT 'pending',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (site_code, article_id)
);

CREATE INDEX IF NOT EXISTS idx_ann_type      ON announcements (type);
CREATE INDEX IF NOT EXISTS idx_ann_time      ON announcements (publish_time);
CREATE INDEX IF NOT EXISTS idx_ann_district  ON announcements (district_name);
CREATE INDEX IF NOT EXISTS idx_ann_project   ON announcements (project_code);
CREATE INDEX IF NOT EXISTS idx_ann_purchaser ON announcements (purchaser);
CREATE INDEX IF NOT EXISTS idx_ann_tags      ON announcements USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_ann_status    ON announcements (detail_status) WHERE detail_status = 'pending';

CREATE TABLE IF NOT EXISTS intention_items (
  id              BIGSERIAL PRIMARY KEY,
  announcement_id BIGINT NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  seq_no          INT,
  item_name       TEXT NOT NULL,
  item_summary    TEXT,
  budget_amount   NUMERIC(18,2),
  expect_month    TEXT,
  remark          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_intent_ann  ON intention_items (announcement_id);
CREATE INDEX IF NOT EXISTS idx_intent_name ON intention_items (item_name);

CREATE TABLE IF NOT EXISTS projects (
  id            BIGSERIAL PRIMARY KEY,
  project_code  TEXT NOT NULL,
  project_name  TEXT,
  purchaser     TEXT,
  first_seen    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen     TIMESTAMPTZ,
  stage         TEXT NOT NULL DEFAULT 'intention',
  budget_amount NUMERIC(18,2),
  award_amount  NUMERIC(18,2),
  winner        TEXT,
  tags          JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_code)
);

CREATE TABLE IF NOT EXISTS sales_regions (
  id           SERIAL PRIMARY KEY,
  sales_name   TEXT NOT NULL,
  sales_email  TEXT NOT NULL,
  region       TEXT NOT NULL,
  region_code  TEXT,
  note         TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sales_email, region)
);

CREATE TABLE IF NOT EXISTS daily_digests (
  id            BIGSERIAL PRIMARY KEY,
  report_date   DATE NOT NULL,
  sales_email   TEXT NOT NULL,
  region        TEXT NOT NULL,
  intention_cnt INT DEFAULT 0,
  bidding_cnt   INT DEFAULT 0,
  award_cnt     INT DEFAULT 0,
  sent_at       TIMESTAMPTZ,
  status        TEXT NOT NULL DEFAULT 'pending',
  error         TEXT,
  UNIQUE (report_date, sales_email, region)
);

CREATE TABLE IF NOT EXISTS collect_runs (
  id            BIGSERIAL PRIMARY KEY,
  run_date      DATE NOT NULL,
  site_code     TEXT NOT NULL,
  category      TEXT NOT NULL,
  page_count    INT,
  fetched_cnt   INT,
  inserted_cnt  INT,
  detail_ok_cnt INT,
  status        TEXT NOT NULL,
  error         TEXT,
  started_at    TIMESTAMPTZ,
  finished_at   TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS announcement_tags (
  id              BIGSERIAL PRIMARY KEY,
  announcement_id BIGINT NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  tag_key         TEXT NOT NULL,
  tag_value       TEXT NOT NULL,
  operator        TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (announcement_id, tag_key, tag_value)
);

CREATE INDEX IF NOT EXISTS idx_tag_ann ON announcement_tags (announcement_id);

-- budget_amount 为空时不落入 ELSE（否则会误标 >1000万）
CREATE OR REPLACE VIEW v_daily_summary AS
SELECT
  (publish_time AT TIME ZONE 'Asia/Shanghai')::date AS day,
  district_name,
  type,
  type_detail,
  CASE
    WHEN budget_amount IS NULL THEN NULL
    WHEN budget_amount < 500000 THEN '<50万'
    WHEN budget_amount < 2000000 THEN '50-200万'
    WHEN budget_amount < 10000000 THEN '200-1000万'
    ELSE '>1000万'
  END AS amount_band,
  count(*) AS cnt
FROM announcements
GROUP BY 1, 2, 3, 4, 5;

-- 标签驱动：区划 × 类型 计数（M3 分析底座）
CREATE OR REPLACE VIEW v_by_district_type AS
SELECT
  tags->>'district' AS district,
  tags->>'type' AS type,
  tags->>'amount_band' AS amount_band,
  count(*) AS cnt
FROM announcements
GROUP BY 1, 2, 3;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_announcements_updated ON announcements;
CREATE TRIGGER trg_announcements_updated
BEFORE UPDATE ON announcements
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_sales_regions_updated ON sales_regions;
CREATE TRIGGER trg_sales_regions_updated
BEFORE UPDATE ON sales_regions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
