// ユーザー設定を取得・保存する API Route です。
// NextAuth セッションでユーザーを確認してから DB 操作を行います。

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/AuthOptions";
import { fetchUserSettings, upsertUserSettings } from "@/lib/UserSettingsRepository";
import {
    MIN_WATER_TARGET_ML, MAX_WATER_TARGET_ML,
    MIN_CARBS_TARGET_G, MAX_CARBS_TARGET_G,
    MIN_SALT_TARGET_G, MAX_SALT_TARGET_G,
} from "@/constants/AppConstants";

// 各フィールドはオプション（更新したい項目だけ送信できる）
const settingsSchema = z.object({
    waterTargetMl: z.number().min(MIN_WATER_TARGET_ML).max(MAX_WATER_TARGET_ML).optional(),
    carbsTargetG: z.number().min(MIN_CARBS_TARGET_G).max(MAX_CARBS_TARGET_G).optional(),
    saltTargetG: z.number().min(MIN_SALT_TARGET_G).max(MAX_SALT_TARGET_G).optional(),
    locale: z.enum(["ja", "en"]).optional(),
    plan: z.enum(["free", "full"]).optional(),
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

    await upsertUserSettings(session.user.id, result.data);
    return NextResponse.json({ ok: true });
}
