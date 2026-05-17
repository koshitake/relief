// かゆみ傾向統計を返す API Route です。
// 月次または週次でグループ化した平均スコアと最頻出部位を返します。

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/AuthOptions";
import supabase from "@/lib/SupabaseAdmin";

// 返すデータの型
export interface ItchStatEntry {
    label: string;                    // "2026-05" (月次) または "2026-05-05" (週の月曜日)
    avgScore: number;                 // 平均かゆみスコア（小数点1桁）
    count: number;                    // 記録件数
    areaCounts: Record<string, number>; // 部位名 → その期間に記録された日数
}

// 指定日付文字列が属する週の月曜日を返す（ISO週の基準）
function getMondayOfWeek(dateStr: string): string {
    const date = new Date(dateStr + "T00:00:00Z");
    const dayOfWeek = date.getUTCDay(); // 0=日, 1=月, ..., 6=土
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(date);
    monday.setUTCDate(date.getUTCDate() + daysToMonday);
    return monday.toISOString().slice(0, 10);
}

/** かゆみ統計を取得する */
export async function GET(req: NextRequest): Promise<NextResponse> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const granularity = searchParams.get("granularity") === "weekly" ? "weekly" : "monthly";
    const count = Math.min(24, Math.max(1, Number(searchParams.get("count") ?? "12")));

    const userId = session.user.id;

    // 取得期間の開始日を計算する
    const now = new Date();
    const startDate = new Date(now);
    if (granularity === "monthly") {
        startDate.setMonth(now.getMonth() - count + 1);
        startDate.setDate(1);
    } else {
        startDate.setDate(now.getDate() - (count - 1) * 7);
        // 週の月曜日に揃える
        const day = startDate.getDay();
        startDate.setDate(startDate.getDate() - (day === 0 ? 6 : day - 1));
    }

    const startDateStr = startDate.toISOString().slice(0, 10);

    if (!supabase) return NextResponse.json([], { status: 200 });

    const { data, error } = await supabase
        .from("day_records")
        .select("day, itch_score, itch_area")
        .eq("user_id", userId)
        .gte("day", startDateStr)
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
            ? row.day.slice(0, 7)          // "YYYY-MM"
            : getMondayOfWeek(row.day);    // 週の月曜日の日付

        if (!groups.has(label)) {
            groups.set(label, { scores: [], areaCounts: {} });
        }
        const group = groups.get(label)!;
        group.scores.push(row.itch_score ?? 0);

        // 部位ごとに出現日数をカウントする（1日1カウント）
        if (row.itch_area) {
            row.itch_area.split(",").filter(Boolean).forEach((area) => {
                group.areaCounts[area] = (group.areaCounts[area] ?? 0) + 1;
            });
        }
    }

    // ラベルを昇順にソートして結果を組み立てる
    const result: ItchStatEntry[] = Array.from(groups.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([label, { scores, areaCounts }]) => ({
            label,
            avgScore: Math.round((scores.reduce((s, v) => s + v, 0) / scores.length) * 10) / 10,
            count:    scores.length,
            areaCounts,
        }));

    return NextResponse.json(result);
}
