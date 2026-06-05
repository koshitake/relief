// Google Drive バックアップからデータを復元する API Route です。
// 固定名ファイル（atolog-backup.json.gz）をサーバー側で自動検索して復元します。
// gzip 圧縮ファイルと旧形式の生 JSON（.json）の両方に対応します。
// plan は復元対象外とし、現在のプランを保持します。

import { NextResponse } from "next/server";
import { promisify } from "util";
import { gunzip } from "zlib";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/AuthOptions";
import { fetchUserSettings, upsertUserSettings } from "@/lib/UserSettingsRepository";
import { batchUpsertDayRecords } from "@/lib/DayRecordRepository";
import { getOrCreateAtologFolder, findBackupFile, downloadBackupFile } from "@/lib/GoogleDriveRepository";
import type { WaterLog } from "@/types/DayRecord";

const gunzipAsync = promisify(gunzip);

// ダウンロードファイルの上限（10MB）
const MAX_DOWNLOAD_BYTES = 10 * 1024 * 1024;
// gzip 展開後の上限（50MB）。圧縮爆弾攻撃を防ぐ
const MAX_DECOMPRESSED_BYTES = 50 * 1024 * 1024;
// 復元レコードの件数上限（約10年分）
const MAX_RESTORE_RECORDS = 3650;

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
    itchArea:     string[];
    itchScore:    number;
    waterLogs:    WaterLog[];
    exerciseText: string;
    note:         string;
    mealsText:    string;
    carbsG?:      number;
    saltG?:       number;
    proteinG?:    number;
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

    // 後方互換: 旧バックアップは文字列形式、新バックアップは配列形式
    const rawArea = row.itchArea;
    const itchArea: string[] = Array.isArray(rawArea)
        ? (rawArea as unknown[]).filter((s) => typeof s === "string").map(String)
        : typeof rawArea === "string" && rawArea
            ? rawArea.split(",").filter(Boolean)
            : [];

    return {
        day,
        itchArea,
        itchScore:    Number(row.itchScore ?? 0),
        waterLogs,
        exerciseText: String(row.exerciseText ?? ""),
        note:         String(row.note ?? ""),
        mealsText:    String(row.mealsText ?? ""),
        carbsG:    typeof row.carbsG   === "number" ? row.carbsG   : undefined,
        saltG:     typeof row.saltG    === "number" ? row.saltG    : undefined,
        proteinG:  typeof row.proteinG === "number" ? row.proteinG : undefined,
    };
}

/** バックアップから全データを復元する */
export async function POST(): Promise<NextResponse> {
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

    try {
        // Drive の atolog フォルダから固定名のバックアップファイルを検索する
        const folderId = await getOrCreateAtologFolder(session.accessToken);
        const fileId   = await findBackupFile(session.accessToken, folderId);
        if (!fileId) {
            return NextResponse.json({ error: "Backup file not found" }, { status: 404 });
        }

        // バックアップファイルをダウンロードする（Buffer で返る）
        const raw = await downloadBackupFile(session.accessToken, fileId);

        if (raw.length > MAX_DOWNLOAD_BYTES) {
            return NextResponse.json({ error: "Backup file is too large" }, { status: 400 });
        }

        // gzip マジックバイト（0x1f 0x8b）で圧縮フォーマットを判定して展開する
        // maxOutputLength で展開後サイズを制限し、圧縮爆弾攻撃を防ぐ
        // 旧形式（生 JSON）との後方互換性を保つ
        const isGzip = raw.length >= 2 && raw[0] === 0x1f && raw[1] === 0x8b;
        const jsonBuffer = isGzip
            ? await gunzipAsync(raw, { maxOutputLength: MAX_DECOMPRESSED_BYTES })
            : raw;
        const content = jsonBuffer.toString("utf-8");

        const backup  = JSON.parse(content) as unknown;

        if (!isValidBackup(backup)) {
            return NextResponse.json({ error: "Invalid backup file format" }, { status: 400 });
        }

        // 設定を復元する（plan は現在の値を保持するため除外）
        const s = backup.settings;
        await upsertUserSettings(userId, {
            ...(typeof s.waterTargetMl  === "number" && { waterTargetMl:  s.waterTargetMl }),
            ...(typeof s.carbsTargetG   === "number" && { carbsTargetG:   s.carbsTargetG }),
            ...(typeof s.saltTargetG    === "number" && { saltTargetG:    s.saltTargetG }),
            ...(typeof s.proteinTargetG === "number" && { proteinTargetG: s.proteinTargetG }),
            ...(s.locale === "ja" || s.locale === "en" ? { locale: s.locale } : {}),
        });

        // レコードを変換して一括 upsert する（既存データは上書き）
        // 件数上限を超えた分は切り捨てる（約10年分以上は想定外のデータとみなす）
        const records = backup.records
            .slice(0, MAX_RESTORE_RECORDS)
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
