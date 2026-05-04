// 指定日の記録を取得・保存する API Route です。
// NextAuth セッションでユーザーを確認してから DB 操作を行います。

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/AuthOptions";
import { fetchDayRecord, upsertDayRecord } from "@/lib/DayRecordRepository";
import { DayRecord } from "@/types/DayRecord";

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
    const body = await req.json() as DayRecord;
    await upsertDayRecord(day, session.user.id, body);
    return NextResponse.json({ ok: true });
}
