// Supabase クライアントのシングルトンインスタンスを生成するファイルです。
// 環境変数が未設定の場合は null を返します（DBなしモードで動作します）。

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 環境変数が未設定の場合は null（DBなしモード）
let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: true,    // ブラウザにセッションを保持する
            autoRefreshToken: true,  // トークンを自動更新する
        },
    });
} else {
    console.warn(
        "[Relief] Supabase 環境変数が未設定のため、DBなしモードで動作します。" +
        "NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を .env に設定してください。"
    );
}

export default supabase;
