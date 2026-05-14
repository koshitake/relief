// Google Drive バックアップからデータを復元する API Route です。
// バックアップ JSON を読み込み、設定と記録を DB に upsert します。
// plan は復元対象外とし、現在のプランを保持します。

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/AuthOptions";
import { fetchUserSettings, upsertUserSettings } from "@/lib/UserSettingsRepository";
import { batchUpsertDayRecords } from "@/lib/DayRecordRepository";
import { downloadBackupFile } from "@/lib/GoogleDriveRepository";
import type { WaterLog } from "@/types/DayRecord";

const bodySchema = z.object({
    fileId: z.string().min(1).max(300),
});

// バックアップ JSON の最低限の構造を確認する
function isValidBackup(data: unknown): data is {
    version:  string;
    settings: Record<string, unknown>;
    records:  unknown[];
} {
    if (typeof data !== "object" || data === null) return false;
    const d = data as Record<string, unknown>;
    return typeof d.version === "string"
        && typeof d.settings === "object"
        && d.settings !== null
        && Array.isArray(d.records);
}

// バックアップ内の1件のレコードを安全に変換する
function parseRecord(r: unknown): {
    day:          string;
    itchArea:     string;
    itchScore:    number;
    waterLogs:    WaterLog[];
    exerciseText: string;
    note:         string;
    mealsText:    string;
    carbsG?:      number;
    saltG?:       number;
} | null {
    if (typeof r !== "object" || r === null) return null;
    const row = r as Record<string, unknown>;

    const day = String(row.day ?? "");
    // 日付形式が不正なレコードは除外する
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;

    const waterLogs: WaterLog[] = Array.isArray(row.waterLogs)
        ? (row.waterLogs as unknown[])
              .filter((log): log is { time: string; ml: number } =>
                  typeof log === "object" && log !== null
                  && typeof (log as Record<string, unknown>).time === "string"
                  && typeof (log as Record<string, unknown>).ml === "number")
              .map((log) => ({ time: log.time, ml: log.ml }))
        : [];

    return {
        day,
        itchArea:     String(row.itchArea ?? ""),
        itchScore:    Number(row.itchScore ?? 0),
        waterLogs,
        exerciseText: String(row.exerciseText ?? ""),
        note:         String(row.note ?? ""),
        mealsText:    String(row.mealsText ?? ""),
        carbsG:       typeof row.carbsG === "number" ? row.carbsG : undefined,
        saltG:        typeof row.saltG  === "number" ? row.saltG  : undefined,
    };
}

/** バックアップから全データを復元する */
export async function POST(req: NextRequest): Promise<NextResponse> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Drive スコープが付与されていない場合は再サインインを促す
    if (!session.hasDriveScope || !session.accessToken) {
        return NextResponse.json({ error: "Drive scope not granted" }, { status: 403 });
    }

    const userId = session.user.id;

    // プランを DB から取得してバックアップ権限を確認する（無料プランは不可）
    const currentSettings = await fetchUserSettings(userId);
    if (!currentSettings || currentSettings.plan === "free") {
        return NextResponse.json({ error: "Upgrade required" }, { status: 403 });
    }

    // リクエストボディのバリデーション
    const parseResult = bodySchema.safeParse(await req.json());
    if (!parseResult.success) {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    try {
        // Drive からバックアップファイルをダウンロードして JSON に変換する
        const content = await downloadBackupFile(session.accessToken, parseResult.data.fileId);
        const backup  = JSON.parse(content) as unknown;

        if (!isValidBackup(backup)) {
            return NextResponse.json({ error: "Invalid backup file format" }, { status: 400 });
        }

        // 設定を復元する（plan は現在の値を保持するため除外）
        const s = backup.settings;
        await upsertUserSettings(userId, {
            ...(typeof s.waterTargetMl === "number" && { waterTargetMl: s.waterTargetMl }),
            ...(typeof s.carbsTargetG  === "number" && { carbsTargetG:  s.carbsTargetG }),
            ...(typeof s.saltTargetG   === "number" && { saltTargetG:   s.saltTargetG }),
            ...(s.locale === "ja" || s.locale === "en" ? { locale: s.locale } : {}),
        });

        // レコードを変換して一括 upsert する（既存データは上書き）
        const records = backup.records
            .map(parseRecord)
            .filter((r): r is NonNullable<ReturnType<typeof parseRecord>> => r !== null);

        if (records.length > 0) {
            await batchUpsertDayRecords(userId, records);
        }

        return NextResponse.json({ count: records.length });
    } catch (error) {
        console.error("[Relief] 復元エラー:", error);
        return NextResponse.json({ error: "Restore failed" }, { status: 500 });
    }
}
