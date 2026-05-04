// サーバー専用の Supabase 管理クライアントです。
// service_role キーを使用するため、必ずサーバー側（API Route / Server Component）でのみ使用すること。
// クライアントコンポーネントや "use client" ファイルから import しないこと。

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseAdmin: SupabaseClient | null = null;

if (supabaseUrl && serviceRoleKey) {
    supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            // サーバー側では自動セッション管理は不要
            persistSession: false,
            autoRefreshToken: false,
        },
    });
} else {
    console.warn(
        "[Relief] SUPABASE_SERVICE_ROLE_KEY が未設定のため、DBなしモードで動作します。"
    );
}

export default supabaseAdmin;
