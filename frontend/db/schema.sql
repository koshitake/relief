-- Relief アプリ データベーススキーマ
-- Supabase (PostgreSQL) 用 DDL
-- 実行場所: Supabase ダッシュボード > SQL Editor

-- =====================================================================
-- テーブルの作成
-- =====================================================================

CREATE TABLE day_records (
    id            BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,  -- 内部ID（自動連番）
    user_id       TEXT        NOT NULL,                                   -- Google ユーザーID（NextAuth の token.sub）
    day           DATE        NOT NULL,
    itch_area     TEXT        NOT NULL DEFAULT '',     -- かゆみの部位
    itch_score    INTEGER     NOT NULL DEFAULT 0,      -- かゆみスコア（0〜10）
    water_ml      INTEGER     NOT NULL DEFAULT 0,      -- 水分摂取量の合計（ml）。集計クエリ用
    water_logs    JSONB       NOT NULL DEFAULT '[]',  -- 水分摂取ログ [{"time":"HH:MM","ml":100}, ...]
    exercise_text TEXT        NOT NULL DEFAULT '',     -- 運動内容
    note          TEXT        NOT NULL DEFAULT '',     -- メモ・症状・気づき
    meals_text    TEXT        NOT NULL DEFAULT '',     -- 食事内容
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW(),
    -- 1ユーザーにつき1日1レコードを保証する（upsert の重複判定に使用）
    UNIQUE (user_id, day)
);

-- =====================================================================
-- トリガー
-- =====================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER day_records_updated_at
    BEFORE UPDATE ON day_records
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- インデックス
-- =====================================================================

CREATE INDEX idx_day_records_user_day ON day_records (user_id, day);

-- =====================================================================
-- RLS（Row Level Security）
-- NextAuth を使用するため Supabase Auth は使わない。
-- anon キーからの操作を許可し、アプリ側で user_id によるフィルタリングを行う。
-- =====================================================================

ALTER TABLE day_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_for_anon" ON day_records
    FOR ALL
    TO anon
    USING (true)
    WITH CHECK (true);
