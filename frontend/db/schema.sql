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
    avatar_url   TEXT,                          -- プロフィール画像の URL。NULL は未設定
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
    protein_g     NUMERIC,                          -- タンパク質（g）手動入力。NULL は未入力
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- 1ユーザーにつき1日1レコードを保証する（upsert の重複判定に使用）
    UNIQUE (user_id, day)
);

-- ユーザー設定テーブル
CREATE TABLE IF NOT EXISTS user_settings (
    user_id         UUID        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    water_target_ml    INTEGER     NOT NULL DEFAULT 1500,
    carbs_target_g     NUMERIC     NOT NULL DEFAULT 130,
    salt_target_g      NUMERIC     NOT NULL DEFAULT 10,
    protein_target_g   NUMERIC     NOT NULL DEFAULT 60,
    locale          TEXT        NOT NULL DEFAULT 'ja' CHECK (locale IN ('ja', 'en')),
    -- plan は数値 ID で管理する。0=free, 10=full（10刻みで間への新プラン挿入に対応）
    -- プラン名・階層はコード側（UserSettingsRepository）で管理し、DBは番号のみ保持する
    plan            INTEGER     NOT NULL DEFAULT 0 CHECK (plan >= 0),
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

-- =====================================================================
-- マイグレーション履歴
-- =====================================================================

-- [2026-05-23] user_settings.plan を TEXT → INTEGER に変更
-- plan 名をコード側で管理し、DB制約・名前変更の影響を受けないようにする
-- Supabase SQL Editor で実行:
--
-- ALTER TABLE user_settings DROP CONSTRAINT user_settings_plan_check;
-- ALTER TABLE user_settings ALTER COLUMN plan DROP DEFAULT;
-- ALTER TABLE user_settings ALTER COLUMN plan TYPE INTEGER USING 0;
-- ALTER TABLE user_settings ALTER COLUMN plan SET DEFAULT 0;
-- ALTER TABLE user_settings ADD CONSTRAINT user_settings_plan_check CHECK (plan >= 0);

-- [2026-05-23] day_records に carbs_g / salt_g 列を追加
-- 糖質・塩分の手動入力値を保存する。NULL は未入力を意味する
-- Supabase SQL Editor で実行:
--
-- ALTER TABLE day_records ADD COLUMN IF NOT EXISTS carbs_g NUMERIC;
-- ALTER TABLE day_records ADD COLUMN IF NOT EXISTS salt_g  NUMERIC;

-- [2026-06-03] タンパク質を追加
-- day_records に protein_g、user_settings に protein_target_g を追加する
-- Supabase SQL Editor で実行:
--
-- ALTER TABLE day_records ADD COLUMN IF NOT EXISTS protein_g NUMERIC;
-- ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS protein_target_g NUMERIC NOT NULL DEFAULT 60;

-- [2026-06-28] プロフィール画像 URL を追加
-- users に avatar_url を追加する。NULL は未設定を意味する
-- Supabase SQL Editor で実行:
--
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
