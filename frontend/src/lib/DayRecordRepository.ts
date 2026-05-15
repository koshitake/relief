// day_records テーブルへの CRUD 操作を提供するリポジトリです。
// Supabase が未設定の場合はすべての操作を無視します（DBなしモード）。

// サーバー側（API Route）からのみ呼び出すこと
import supabase from "@/lib/SupabaseAdmin";
import { DayRecord, WaterLog, calcTotalWaterMl, createEmptyDayRecord } from "@/types/DayRecord";

// 本番環境では DB の内部エラー詳細をコンソールに出力しない（情報漏洩対策）
function logDbError(context: string, error: { message: string }) {
    if (process.env.NODE_ENV !== "production") {
        console.error(`[Relief] ${context} エラー:`, error.message);
    } else {
        console.error(`[Relief] ${context} でエラーが発生しました`);
    }
}

// DB のカラム名（snake_case）と DayRecord のフィールド名（camelCase）のマッピング
// DB から取得した行を DayRecord に変換する
function rowToDayRecord(row: Record<string, unknown>): DayRecord {
    // water_logs カラム（JSONB）からログ一覧を復元する。
    // 不正な要素は除外し、型安全に変換する。
    const waterLogs: WaterLog[] = Array.isArray(row.water_logs)
        ? (row.water_logs as Array<{ time: unknown; ml: unknown }>)
              .filter((log) => typeof log.time === "string" && typeof log.ml === "number")
              .map((log) => ({ time: log.time as string, ml: log.ml as number }))
        : [];

    return {
        itchArea:     String(row.itch_area ?? ""),
        itchScore:    Number(row.itch_score ?? 0),
        waterLogs,
        exerciseText: String(row.exercise_text ?? ""),
        note:         String(row.note ?? ""),
        mealsText:    String(row.meals_text ?? ""),
    };
}

// DayRecord を DB 保存用の行データに変換する
function dayRecordToRow(
    day: string,
    userId: string,
    record: DayRecord
): Record<string, unknown> {
    return {
        day,
        user_id:       userId,
        itch_area:     record.itchArea,
        itch_score:    record.itchScore,
        // water_ml は集計クエリ用の合計値。water_logs に個別ログを保存する
        water_ml:      calcTotalWaterMl(record.waterLogs),
        water_logs:    record.waterLogs,
        exercise_text: record.exerciseText,
        note:          record.note,
        meals_text:    record.mealsText,
        updated_at:    new Date().toISOString(),
    };
}

/**
 * 指定日の記録を DB から取得する。
 * 存在しない場合は null を返す。
 * Supabase 未設定の場合は null を返す。
 */
export async function fetchDayRecord(
    day: string,
    userId: string
): Promise<DayRecord | null> {
    if (!supabase) return null;

    const { data, error } = await supabase
        .from("day_records")
        .select("*")
        .eq("day", day)
        .eq("user_id", userId)
        .maybeSingle();

    if (error) {
        logDbError("fetchDayRecord", error);
        return null;
    }

    if (!data) return null;

    return rowToDayRecord(data);
}

/**
 * 指定日の記録を DB に upsert（存在すれば更新、なければ挿入）する。
 * UNIQUE(user_id, day) 制約を利用して重複を判定する。
 * Supabase 未設定の場合は何もしない。
 */
export async function upsertDayRecord(
    day: string,
    userId: string,
    record: DayRecord
): Promise<void> {
    if (!supabase) return;

    const row = dayRecordToRow(day, userId, record);

    const { error } = await supabase
        .from("day_records")
        .upsert(row, {
            // (user_id, day) の複合ユニーク制約で重複を判定する
            onConflict: "user_id,day",
            ignoreDuplicates: false,
        });

    if (error) {
        logDbError("upsertDayRecord", error);
    }
}

/**
 * cutoffDay より古い記録を DB から削除する（無料プランの14日制限）。
 * Supabase 未設定の場合は何もしない。
 */
export async function deleteOldDayRecords(
    cutoffDay: string,
    userId: string
): Promise<void> {
    if (!supabase) return;

    const { error } = await supabase
        .from("day_records")
        .delete()
        .lt("day", cutoffDay)
        .eq("user_id", userId);

    if (error) {
        logDbError("deleteOldDayRecords", error);
    }
}

/**
 * 指定年月の記録を全件取得する（月次グラフ用）。
 * 記録がない場合は空配列を返す。
 */
export async function fetchDayRecordsByMonth(
    year: number,
    month: number,
    userId: string
): Promise<Array<{ day: string; waterLogs: WaterLog[] }>> {
    if (!supabase) return [];

    const startDay = `${year}-${String(month).padStart(2, "0")}-01`;
    // 翌月の1日を終端として、その日より前のデータを取得する
    const endDay = month === 12
        ? `${year + 1}-01-01`
        : `${year}-${String(month + 1).padStart(2, "0")}-01`;

    const { data, error } = await supabase
        .from("day_records")
        .select("day, water_logs")
        .eq("user_id", userId)
        .gte("day", startDay)
        .lt("day", endDay)
        .order("day", { ascending: true });

    if (error) {
        logDbError("fetchDayRecordsByMonth", error);
        return [];
    }

    return (data ?? []).map((row) => {
        const waterLogs: WaterLog[] = Array.isArray(row.water_logs)
            ? (row.water_logs as Array<{ time: unknown; ml: unknown }>)
                  .filter((log) => typeof log.time === "string" && typeof log.ml === "number")
                  .map((log) => ({ time: log.time as string, ml: log.ml as number }))
            : [];
        return { day: row.day as string, waterLogs };
    });
}

// 1回のクエリで取得する最大件数（Supabase のデフォルト上限に合わせる）
const FETCH_PAGE_SIZE = 1000;

// DB の行を DayRecord に変換するヘルパー
function rowToFullRecord(row: Record<string, unknown>): { day: string } & DayRecord {
    const waterLogs: WaterLog[] = Array.isArray(row.water_logs)
        ? (row.water_logs as Array<{ time: unknown; ml: unknown }>)
              .filter((log) => typeof log.time === "string" && typeof log.ml === "number")
              .map((log) => ({ time: log.time as string, ml: log.ml as number }))
        : [];

    return {
        day:          String(row.day ?? ""),
        itchArea:     String(row.itch_area ?? ""),
        itchScore:    Number(row.itch_score ?? 0),
        waterLogs,
        exerciseText: String(row.exercise_text ?? ""),
        note:         String(row.note ?? ""),
        mealsText:    String(row.meals_text ?? ""),
        carbsG:       row.carbs_g != null ? Number(row.carbs_g) : undefined,
        saltG:        row.salt_g  != null ? Number(row.salt_g)  : undefined,
    };
}

/**
 * ユーザーの全記録を取得する（バックアップ用）。
 * Supabase の 1,000件上限を超える場合はページネーションで全件取得する。
 * Supabase 未設定の場合は空配列を返す。
 */
export async function fetchAllDayRecords(
    userId: string
): Promise<Array<{ day: string } & DayRecord>> {
    if (!supabase) return [];

    const allRows: Array<{ day: string } & DayRecord> = [];
    let offset = 0;

    // 取得件数が上限未満になるまでページを繰り返す
    while (true) {
        const { data, error } = await supabase
            .from("day_records")
            .select("*")
            .eq("user_id", userId)
            .order("day", { ascending: true })
            .range(offset, offset + FETCH_PAGE_SIZE - 1);

        if (error) {
            console.error("[Relief] fetchAllDayRecords エラー:", error.message, "code:", error.code);
            return [];
        }

        const rows = data ?? [];
        allRows.push(...rows.map((r) => rowToFullRecord(r as Record<string, unknown>)));

        // 取得件数が上限未満なら最終ページ
        if (rows.length < FETCH_PAGE_SIZE) break;

        offset += FETCH_PAGE_SIZE;
    }

    console.log(`[Relief] fetchAllDayRecords: userId=${userId}, 取得件数=${allRows.length}`);
    return allRows;
}

/**
 * 複数日の記録を一括 upsert する（復元用）。
 * UNIQUE(user_id, day) 制約を利用して重複を上書きする。
 * Supabase 未設定または空配列の場合は何もしない。
 */
export async function batchUpsertDayRecords(
    userId: string,
    records: Array<{ day: string } & DayRecord>
): Promise<void> {
    if (!supabase || records.length === 0) return;

    const rows = records.map((r) => ({
        user_id:       userId,
        day:           r.day,
        itch_area:     r.itchArea,
        itch_score:    r.itchScore,
        water_ml:      calcTotalWaterMl(r.waterLogs),
        water_logs:    r.waterLogs,
        exercise_text: r.exerciseText,
        note:          r.note,
        meals_text:    r.mealsText,
        // carbs_g / salt_g は値がある場合のみ含める。
        // カラムが DB に存在しない環境でも失敗しないようにするため。
        ...(r.carbsG != null ? { carbs_g: r.carbsG } : {}),
        ...(r.saltG  != null ? { salt_g:  r.saltG  } : {}),
        updated_at:    new Date().toISOString(),
    }));

    const { error } = await supabase
        .from("day_records")
        .upsert(rows, { onConflict: "user_id,day", ignoreDuplicates: false });

    if (error) {
        logDbError("batchUpsertDayRecords", error);
        throw new Error("Batch upsert failed");
    }
}

// DayRecord のエクスポート（他ファイルが import しやすいように再エクスポート）
export { createEmptyDayRecord };
