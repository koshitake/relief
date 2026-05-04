// ユーザー設定を取得・保存する API Route です。
// NextAuth セッションでユーザーを確認してから DB 操作を行います。

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/AuthOptions";
import { fetchUserSettings, upsertUserSettings } from "@/lib/UserSettingsRepository";

/** ユーザー設定を取得する */
export async function GET(): Promise<NextResponse> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await fetchUserSettings(session.user.id);
    return NextResponse.json(settings ?? null);
}

/** ユーザー設定を保存する */
export async function PUT(req: NextRequest): Promise<NextResponse> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { waterTargetMl } = await req.json() as { waterTargetMl: number };
    await upsertUserSettings(session.user.id, { waterTargetMl });
    return NextResponse.json({ ok: true });
}
