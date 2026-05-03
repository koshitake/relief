-- Relief アプリ データベーススキーマ
-- Supabase (PostgreSQL) 用 DDL
-- 実行場所: Supabase ダッシュボード > SQL Editor
-- 既存テーブルを削除して再作成                                    
DROP TABLE IF EXISTS day_records; 
-- =====================================================================
-- テーブルの作成
-- =====================================================================

CREATE TABLE day_records (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),  -- 内部ID
    user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,  -- Supabase Auth のユーザーID
    day           DATE        NOT NULL,
    itch_area     TEXT        NOT NULL DEFAULT '',     -- かゆみの部位
    itch_score    INTEGER     NOT NULL DEFAULT 0,      -- かゆみスコア（0〜10）
    water_ml      INTEGER     NOT NULL DEFAULT 0,      -- 水分摂取量の合計（ml）。集計クエリ用
    water_logs    JSONB       NOT NULL DEFAULT '[]',   -- 水分摂取ログ [{"time":"HH:MM","ml":100}, ...]
    exercise_text TEXT        NOT NULL DEFAULT '',     -- 運動内容
    note          TEXT        NOT NULL DEFAULT '',     -- メモ・症状・気づき
    meals_text    TEXT        NOT NULL DEFAULT '',     -- 食事内容
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
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
-- ユーザー設定テーブル
-- 日付に紐づかないユーザーごとの設定値を保存する
-- =====================================================================

CREATE TABLE IF NOT EXISTS user_settings (
    user_id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    water_target_ml INTEGER     NOT NULL DEFAULT 2000,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "自分の設定のみ操作可能" ON user_settings
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- =====================================================================
-- RLS（Row Level Security）
-- Supabase Auth を使用するため、auth.uid() でログイン中のユーザーを判定する。
-- ログイン中のユーザーは自分のデータのみ操作できる。
-- =====================================================================

ALTER TABLE day_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "自分のデータのみ操作可能" ON day_records
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
