// user_settings テーブルへの CRUD 操作を提供するリポジトリです。
// Supabase が未設定の場合はすべての操作を無視します（DBなしモード）。

// サーバー側（API Route）からのみ呼び出すこと
import supabase from "@/lib/SupabaseAdmin";
import { DEFAULT_WATER_TARGET_ML, DEFAULT_CARBS_TARGET_G, DEFAULT_SALT_TARGET_G } from "@/constants/AppConstants";

export interface UserSettings {
    waterTargetMl: number;
    carbsTargetG: number;
    saltTargetG: number;
    locale: "ja" | "en";
    plan: "free" | "full";
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
        .select("water_target_ml, carbs_target_g, salt_target_g, locale, plan")
        .eq("user_id", userId)
        .maybeSingle();

    if (error) {
        logDbError("fetchUserSettings", error);
        return null;
    }

    if (!data) {
        return {
            waterTargetMl: DEFAULT_WATER_TARGET_ML,
            carbsTargetG: DEFAULT_CARBS_TARGET_G,
            saltTargetG: DEFAULT_SALT_TARGET_G,
            locale: "ja" as const,
            plan: "free" as const,
        };
    }

    const validPlans = ["free", "full"] as const;
    const plan = validPlans.includes(data.plan) ? data.plan : "free";

    return {
        waterTargetMl: Number(data.water_target_ml),
        carbsTargetG: data.carbs_target_g != null ? Number(data.carbs_target_g) : DEFAULT_CARBS_TARGET_G,
        saltTargetG: data.salt_target_g != null ? Number(data.salt_target_g) : DEFAULT_SALT_TARGET_G,
        locale: (data.locale === "en" ? "en" : "ja") as "ja" | "en",
        plan: plan as "free" | "full",
    };
}

/**
 * ユーザー設定を DB に upsert（存在すれば更新、なければ挿入）する。
 * 指定したフィールドのみ更新し、undefined のフィールドはそのままにする。
 * Supabase 未設定の場合は何もしない。
 */
export async function upsertUserSettings(userId: string, settings: Partial<UserSettings>): Promise<void> {
    if (!supabase) return;

    // undefined のフィールドを除いた更新データを組み立てる
    const updateData: Record<string, unknown> = {
        user_id: userId,
        updated_at: new Date().toISOString(),
    };
    if (settings.waterTargetMl !== undefined) updateData.water_target_ml = settings.waterTargetMl;
    if (settings.carbsTargetG !== undefined) updateData.carbs_target_g = settings.carbsTargetG;
    if (settings.saltTargetG !== undefined) updateData.salt_target_g = settings.saltTargetG;
    if (settings.locale !== undefined) updateData.locale = settings.locale;
    if (settings.plan !== undefined) updateData.plan = settings.plan;

    const { error } = await supabase
        .from("user_settings")
        .upsert(updateData, { onConflict: "user_id" });

    if (error) {
        logDbError("upsertUserSettings", error);
    }
}
