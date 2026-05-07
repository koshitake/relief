// 指定年月の水分摂取データを一括取得する API Route です。
// 月次グラフ表示に使用します。

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/AuthOptions";
import { fetchDayRecordsByMonth } from "@/lib/DayRecordRepository";
import { calcTotalWaterMl } from "@/types/DayRecord";

const querySchema = z.object({
    year:  z.coerce.number().int().min(2020).max(2100),
    month: z.coerce.number().int().min(1).max(12),
});

/** 指定年月の日別合計水分量を返す（記録がない日は含まない） */
export async function GET(req: NextRequest): Promise<NextResponse> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const result = querySchema.safeParse({
        year:  searchParams.get("year"),
        month: searchParams.get("month"),
    });

    if (!result.success) {
        return NextResponse.json({ error: "Invalid params" }, { status: 400 });
    }

    const { year, month } = result.data;
    const records = await fetchDayRecordsByMonth(year, month, session.user.id);

    // 水分ログがある日のみ返す
    const response = records
        .map((r) => ({ day: r.day, totalMl: calcTotalWaterMl(r.waterLogs) }))
        .filter((r) => r.totalMl > 0);

    return NextResponse.json(response);
}
