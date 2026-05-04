// Supabase 接続テスト用 API ルートです。
// GET /api/health にアクセスすると接続状態を返します。
// 接続確認後は削除してください。

import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/SupabaseAdmin";

export async function GET() {
    // 環境変数が未設定の場合
    if (!supabaseAdmin) {
        return NextResponse.json(
            {
                status: "error",
                message: "Supabase 環境変数が未設定です。NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を設定してください。",
            },
            { status: 500 }
        );
    }

    // day_records テーブルへの疎通確認（件数のみ取得）
    const { error } = await supabaseAdmin
        .from("day_records")
        .select("id", { count: "exact", head: true });

    if (error) {
        return NextResponse.json(
            {
                status: "error",
                message: `DB 接続エラー: ${error.message}`,
            },
            { status: 500 }
        );
    }

    return NextResponse.json({ status: "ok", message: "Supabase 接続成功" });
}
