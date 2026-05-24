// Next.js が提供する process.env の型定義です。
// @types/node 未インストール環境向けに必要な環境変数のみ宣言します。
declare const process: {
    env: {
        NODE_ENV: "development" | "production" | "test";
        NEXT_PUBLIC_APP_URL?: string;
        NEXT_PUBLIC_SUPABASE_URL?: string;
        NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
        // サーバーサイド専用（NEXT_PUBLIC_ なし = クライアントバンドルに含まない）
        OPEN_METEO_FORECAST_URL?: string;
        OPEN_METEO_ARCHIVE_URL?: string;
        NEXTAUTH_SECRET?: string;
        GOOGLE_CLIENT_ID?: string;
        GOOGLE_CLIENT_SECRET?: string;
        SUPABASE_SERVICE_ROLE_KEY?: string;
        APP_ENV?: string;
    };
};
