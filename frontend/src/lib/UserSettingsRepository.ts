// user_settings テーブルへの CRUD 操作を提供するリポジトリです。
// Supabase が未設定の場合はすべての操作を無視します（DBなしモード）。

import supabase from "@/lib/SupabaseClient";
import { DEFAULT_WATER_TARGET_ML } from "@/constants/AppConstants";

export interface UserSettings {
    waterTargetMl: number;
}

// 本番環境では DB の内部エラー詳細をコンソールに出力しない（情報漏洩対策）
function logDbError(context: string, error: { message: string }) {
    if (process.env.NODE_ENV !== "production") {
        console.error(`[Relief] ${context} エラー:`, error.message);
    } else {
        console.error(`[Relief] ${context} でエラーが発生しました`);
    }
}

/**
 * ユーザー設定を DB から取得する。
 * 存在しない場合はデフォルト値を返す。
 * Supabase 未設定の場合は null を返す。
 */
export async function fetchUserSettings(userId: string): Promise<UserSettings | null> {
    if (!supabase) return null;

    const { data, error } = await supabase
        .from("user_settings")
        .select("water_target_ml")
        .eq("user_id", userId)
        .maybeSingle();

    if (error) {
        logDbError("fetchUserSettings", error);
        return null;
    }

    if (!data) return { waterTargetMl: DEFAULT_WATER_TARGET_ML };

    return { waterTargetMl: Number(data.water_target_ml) };
}

/**
 * ユーザー設定を DB に upsert（存在すれば更新、なければ挿入）する。
 * Supabase 未設定の場合は何もしない。
 */
export async function upsertUserSettings(userId: string, settings: UserSettings): Promise<void> {
    if (!supabase) return;

    const { error } = await supabase
        .from("user_settings")
        .upsert(
            {
                user_id:         userId,
                water_target_ml: settings.waterTargetMl,
                updated_at:      new Date().toISOString(),
            },
            { onConflict: "user_id" }
        );

    if (error) {
        logDbError("upsertUserSettings", error);
    }
}
