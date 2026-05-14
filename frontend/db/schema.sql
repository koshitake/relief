-- Relief アプリ データベーススキーマ
-- Supabase (PostgreSQL) 用 DDL
-- 実行場所: Supabase ダッシュボード > SQL Editor
-- ※ 認証は NextAuth + Google OAuth で行う。Supabase Auth は使用しない。
-- =====================================================================
-- テーブルの作成
-- =====================================================================

-- ユーザーテーブル
-- Google OAuth の sub（固有ID）のみ保存する。メールアドレスは保存しない。
CREATE TABLE IF NOT EXISTS users (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    google_sub   TEXT        UNIQUE NOT NULL,   -- Google OAuth の sub（固有識別子）
    display_name TEXT        NOT NULL DEFAULT '',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 日次記録テーブル
CREATE TABLE IF NOT EXISTS day_records (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day           DATE        NOT NULL,
    itch_area     TEXT        NOT NULL DEFAULT '',
    itch_score    INTEGER     NOT NULL DEFAULT 0,
    water_ml      INTEGER     NOT NULL DEFAULT 0,
    water_logs    JSONB       NOT NULL DEFAULT '[]',
    exercise_text TEXT        NOT NULL DEFAULT '',
    note          TEXT        NOT NULL DEFAULT '',
    meals_text    TEXT        NOT NULL DEFAULT '',
    carbs_g       NUMERIC,                          -- 糖質（g）手動入力。NULL は未入力
    salt_g        NUMERIC,                          -- 塩分（g）手動入力。NULL は未入力
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- 1ユーザーにつき1日1レコードを保証する（upsert の重複判定に使用）
    UNIQUE (user_id, day)
);

-- ユーザー設定テーブル
CREATE TABLE IF NOT EXISTS user_settings (
    user_id         UUID        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    water_target_ml INTEGER     NOT NULL DEFAULT 1500,
    carbs_target_g  NUMERIC     NOT NULL DEFAULT 130,
    salt_target_g   NUMERIC     NOT NULL DEFAULT 10,
    locale          TEXT        NOT NULL DEFAULT 'ja' CHECK (locale IN ('ja', 'en')),
    plan            TEXT        NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'standard', 'pro')),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- トリガー
-- =====================================================================

-- updated_at を自動更新するトリガー関数
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER day_records_updated_at
    BEFORE UPDATE ON day_records
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- =====================================================================
-- インデックス
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_day_records_user_day ON day_records (user_id, day);
CREATE INDEX IF NOT EXISTS idx_users_google_sub ON users (google_sub);
