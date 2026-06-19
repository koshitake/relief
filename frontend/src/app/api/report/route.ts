// 主治医向けレポートデータを返す API Route です（Full プラン専用）。
// 指定した年・月の記録を日付昇順で返します。

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/AuthOptions";
import { fetchUserSettings } from "@/lib/UserSettingsRepository";
import supabase from "@/lib/SupabaseAdmin";
import { WaterLog, calcTotalWaterMl } from "@/types/DayRecord";

// 1件のレポート行
export interface ReportRecord {
    day:          string;
    waterMl:      number;
    exerciseText: string;
    carbsG:       number | null;
    saltG:        number | null;
    proteinG:     number | null;
    mealsText:    string;
    itchScore:    number;
    itchArea:     string[];
    note:         string;
}

/** レポートデータを取得する（year・month クエリパラメータで月を指定） */
export async function GET(req: NextRequest): Promise<NextResponse> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Full プランのみ許可する
    const settings = await fetchUserSettings(userId);
    if (!settings || settings.plan !== "full") {
        return NextResponse.json({ error: "Full plan required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const now = new Date();
    const year  = parseInt(searchParams.get("year")  ?? String(now.getFullYear()), 10);
    const month = parseInt(searchParams.get("month") ?? String(now.getMonth() + 1), 10);

    // 月の最初と最後の日付を算出する
    const mm = String(month).padStart(2, "0");
    const startDate = `${year}-${mm}-01`;
    const lastDay   = new Date(year, month, 0).getDate();
    const endDate   = `${year}-${mm}-${String(lastDay).padStart(2, "0")}`;

    if (!supabase) return NextResponse.json([], { status: 200 });

    const { data, error } = await supabase
        .from("day_records")
        .select("day, itch_score, itch_area, water_logs, exercise_text, meals_text, carbs_g, salt_g, protein_g, note")
        .eq("user_id", userId)
        .gte("day", startDate)
        .lte("day", endDate)
        .order("day", { ascending: true });

    if (error) {
        console.error("[Relief] report API エラー:", error.message);
        return NextResponse.json({ error: "DB error" }, { status: 500 });
    }

    const records: ReportRecord[] = (data ?? []).map((row) => {
        const waterLogs: WaterLog[] = Array.isArray(row.water_logs)
            ? (row.water_logs as Array<{ time: unknown; ml: unknown }>)
                  .filter((log) => typeof log.time === "string" && typeof log.ml === "number")
                  .map((log) => ({ time: log.time as string, ml: log.ml as number }))
            : [];

        const rawArea = row.itch_area as string | null;
        const itchArea = rawArea ? rawArea.split(",").filter(Boolean) : [];

        return {
            day:          row.day as string,
            waterMl:      calcTotalWaterMl(waterLogs),
            exerciseText: String(row.exercise_text ?? ""),
            carbsG:       row.carbs_g   != null ? Number(row.carbs_g)   : null,
            saltG:        row.salt_g    != null ? Number(row.salt_g)    : null,
            proteinG:     row.protein_g != null ? Number(row.protein_g) : null,
            mealsText:    String(row.meals_text ?? ""),
            itchScore:    Number(row.itch_score ?? 0),
            itchArea,
            note:         String(row.note ?? ""),
        };
    });

    return NextResponse.json(records);
}
