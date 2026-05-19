// 指定日の記録を取得・保存する API Route です。
// NextAuth セッションでユーザーを確認してから DB 操作を行います。

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/AuthOptions";
import { fetchDayRecord, upsertDayRecord } from "@/lib/DayRecordRepository";
import { MAX_ITCH_SCORE, MAX_WATER_ML } from "@/constants/AppConstants";

// YYYY-MM-DD 形式のみ受け付ける（SQLインジェクション・不正入力対策）
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const dayRecordSchema = z.object({
    // 部位は配列で受け取り、各要素は50文字以内・最大11箇所まで
    itchArea:     z.array(z.string().max(50)).max(11),
    itchScore:    z.number().int().min(0).max(MAX_ITCH_SCORE),
    waterLogs:    z.array(
        z.object({
            // "HH:MM" 形式のみ受け付ける
            time: z.string().regex(/^\d{2}:\d{2}$/),
            ml:   z.number().int().min(1).max(MAX_WATER_ML),
        })
    ).max(100),
    exerciseText: z.string().max(500),
    note:         z.string().max(1000),
    mealsText:    z.string().max(500),
    carbsG:       z.number().min(0).max(9999).optional(),
    saltG:        z.number().min(0).max(999).optional(),
});

/** 指定日の記録を取得する */
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ day: string }> }
): Promise<NextResponse> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { day } = await params;
    if (!DAY_PATTERN.test(day)) {
        return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    const record = await fetchDayRecord(day, session.user.id);
    return NextResponse.json(record ?? null);
}

/** 指定日の記録を保存する */
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ day: string }> }
): Promise<NextResponse> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { day } = await params;
    if (!DAY_PATTERN.test(day)) {
        return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }

    const result = dayRecordSchema.safeParse(await req.json());
    if (!result.success) {
        return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    await upsertDayRecord(day, session.user.id, result.data);
    return NextResponse.json({ ok: true });
}
