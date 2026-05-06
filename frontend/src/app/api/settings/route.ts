// ユーザー設定を取得・保存する API Route です。
// NextAuth セッションでユーザーを確認してから DB 操作を行います。

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/AuthOptions";
import { fetchUserSettings, upsertUserSettings } from "@/lib/UserSettingsRepository";
import { MIN_WATER_TARGET_ML, MAX_WATER_TARGET_ML } from "@/constants/AppConstants";

const settingsSchema = z.object({
    waterTargetMl: z.number().int().min(MIN_WATER_TARGET_ML).max(MAX_WATER_TARGET_ML),
});

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

    const result = settingsSchema.safeParse(await req.json());
    if (!result.success) {
        return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    await upsertUserSettings(session.user.id, { waterTargetMl: result.data.waterTargetMl });
    return NextResponse.json({ ok: true });
}
