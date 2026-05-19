// かゆみ傾向統計を返す API Route です。
// 月次: 当年1〜12月を固定で返す（データがない月は 0 埋め）
// 週次: 指定年月の全週を固定で返す（データがない週は 0 埋め）

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/AuthOptions";
import supabase from "@/lib/SupabaseAdmin";

// 返すデータの型
export interface ItchStatEntry {
    label: string;                      // "2026-05" (月次) または "2026-05-05" (週の月曜日)
    avgScore: number;                   // 平均かゆみスコア（小数点1桁）
    count: number;                      // 記録件数
    areaCounts: Record<string, number>; // 部位名 → その期間に記録された日数
}

// 指定日付文字列が属する週の月曜日を返す
function getMondayOfWeek(dateStr: string): string {
    const date = new Date(dateStr + "T00:00:00Z");
    const dayOfWeek = date.getUTCDay(); // 0=日, 1=月, ..., 6=土
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(date);
    monday.setUTCDate(date.getUTCDate() + daysToMonday);
    return monday.toISOString().slice(0, 10);
}

// 指定年月に含まれる週の月曜日一覧を返す（月をまたぐ週も含む）
function getWeekMondaysInMonth(year: number, month: number): string[] {
    const firstDay = new Date(Date.UTC(year, month - 1, 1));
    const lastDay  = new Date(Date.UTC(year, month, 0));

    // 月の最初の日が属する週の月曜日
    const firstDow = firstDay.getUTCDay();
    const firstMonday = new Date(firstDay);
    firstMonday.setUTCDate(firstDay.getUTCDate() - (firstDow === 0 ? 6 : firstDow - 1));

    // 月の最後の日が属する週の月曜日
    const lastDow = lastDay.getUTCDay();
    const lastMonday = new Date(lastDay);
    lastMonday.setUTCDate(lastDay.getUTCDate() - (lastDow === 0 ? 6 : lastDow - 1));

    // firstMonday から lastMonday まで 7 日ずつ進める
    const mondays: string[] = [];
    const cur = new Date(firstMonday);
    while (cur <= lastMonday) {
        mondays.push(cur.toISOString().slice(0, 10));
        cur.setUTCDate(cur.getUTCDate() + 7);
    }
    return mondays;
}

/** かゆみ統計を取得する */
export async function GET(req: NextRequest): Promise<NextResponse> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const granularity = searchParams.get("granularity") === "weekly" ? "weekly" : "monthly";
    const yearParam  = searchParams.get("year");
    const monthParam = searchParams.get("month");

    const userId = session.user.id;
    const now = new Date();

    let startDateStr: string;
    let endDateStr: string;
    let allLabels: string[]; // 表示すべき全期間ラベル（データなしでも必ず含める）

    if (granularity === "monthly") {
        // 当年の 1 月〜12 月を固定表示する（季節傾向の把握が目的）
        const currentYear = now.getFullYear();
        startDateStr = `${currentYear}-01-01`;
        endDateStr   = `${currentYear}-12-31`;
        allLabels = Array.from({ length: 12 }, (_, i) => {
            const m = i + 1;
            return `${currentYear}-${String(m).padStart(2, "0")}`;
        });
    } else {
        // 週次: 指定年月の全週を固定表示する（月によって 4 週・5 週が変わるため）
        const y = yearParam ? Number(yearParam) : now.getFullYear();
        const m = monthParam ? Number(monthParam) : now.getMonth() + 1;
        startDateStr = new Date(Date.UTC(y, m - 1, 1)).toISOString().slice(0, 10);
        endDateStr   = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
        allLabels = getWeekMondaysInMonth(y, m);
    }

    if (!supabase) return NextResponse.json([], { status: 200 });

    const { data, error } = await supabase
        .from("day_records")
        .select("day, itch_score, itch_area")
        .eq("user_id", userId)
        .gte("day", startDateStr)
        .lte("day", endDateStr)
        .order("day", { ascending: true });

    if (error) {
        console.error("[Relief] itch-stats エラー:", error.message);
        return NextResponse.json({ error: "DB error" }, { status: 500 });
    }

    const rows = (data ?? []) as Array<{ day: string; itch_score: number; itch_area: string | null }>;

    // 月次または週次でグループ化する
    const groups = new Map<string, { scores: number[]; areaCounts: Record<string, number> }>();

    for (const row of rows) {
        const label = granularity === "monthly"
            ? row.day.slice(0, 7)
            : getMondayOfWeek(row.day);

        if (!groups.has(label)) {
            groups.set(label, { scores: [], areaCounts: {} });
        }
        const group = groups.get(label)!;
        group.scores.push(row.itch_score ?? 0);

        if (row.itch_area) {
            row.itch_area.split(",").filter(Boolean).forEach((area) => {
                group.areaCounts[area] = (group.areaCounts[area] ?? 0) + 1;
            });
        }
    }

    // 全ラベルを使って結果を組み立てる（データがない期間は 0 で埋める）
    const result: ItchStatEntry[] = allLabels.map((label) => {
        const group = groups.get(label);
        if (!group || group.scores.length === 0) {
            return { label, avgScore: 0, count: 0, areaCounts: {} };
        }
        return {
            label,
            avgScore: Math.round((group.scores.reduce((s, v) => s + v, 0) / group.scores.length) * 10) / 10,
            count:    group.scores.length,
            areaCounts: group.areaCounts,
        };
    });

    return NextResponse.json(result);
}
