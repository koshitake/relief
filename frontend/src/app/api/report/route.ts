// 主治医向けレポートデータを返す API Route です（Full プラン専用）。
// 指定期間の記録を日付昇順で返します。

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/AuthOptions";
import { fetchUserSettings } from "@/lib/UserSettingsRepository";
import supabase from "@/lib/SupabaseAdmin";
import { WaterLog, calcTotalWaterMl } from "@/types/DayRecord";

// 1件のレポート行
export interface ReportRecord {
    day:          string;
    itchScore:    number;
    itchArea:     string[];
    waterMl:      number;
    mealsText:    string;
    carbsG:       number | null;
    saltG:        number | null;
    proteinG:     number | null;
    note:         string;
}

// 期間のオフセット（月数）を返す
function periodToMonths(period: string): number {
    if (period === "3m") return 3;
    if (period === "6m") return 6;
    return 1; // デフォルト1ヶ月
}

/** レポートデータを取得する */
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
    const period = searchParams.get("period") ?? "1m";
    const months = periodToMonths(period);

    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setMonth(endDate.getMonth() - months);
    startDate.setDate(startDate.getDate() + 1);

    const startDateStr = startDate.toISOString().slice(0, 10);
    const endDateStr   = endDate.toISOString().slice(0, 10);

    if (!supabase) return NextResponse.json([], { status: 200 });

    const { data, error } = await supabase
        .from("day_records")
        .select("day, itch_score, itch_area, water_logs, meals_text, carbs_g, salt_g, protein_g, note")
        .eq("user_id", userId)
        .gte("day", startDateStr)
        .lte("day", endDateStr)
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
            day:       row.day as string,
            itchScore: Number(row.itch_score ?? 0),
            itchArea,
            waterMl:   calcTotalWaterMl(waterLogs),
            mealsText: String(row.meals_text ?? ""),
            carbsG:    row.carbs_g   != null ? Number(row.carbs_g)   : null,
            saltG:     row.salt_g    != null ? Number(row.salt_g)    : null,
            proteinG:  row.protein_g != null ? Number(row.protein_g) : null,
            note:      String(row.note ?? ""),
        };
    });

    return NextResponse.json(records);
}
