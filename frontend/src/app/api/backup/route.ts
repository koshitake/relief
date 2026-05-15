// Google Drive へのバックアップ操作を提供する API Route です。
// POST: 全データを JSON にして gzip 圧縮し固定名ファイルで上書きバックアップする

import { NextRequest, NextResponse } from "next/server";
import { promisify } from "util";
import { gzip } from "zlib";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/AuthOptions";
import { fetchUserSettings } from "@/lib/UserSettingsRepository";
import { fetchAllDayRecords } from "@/lib/DayRecordRepository";
import { getOrCreateAtologFolder, uploadBackupFile } from "@/lib/GoogleDriveRepository";

const gzipAsync = promisify(gzip);

// バックアップファイルの固定名（常に同一ファイルを上書きする）
const BACKUP_FILENAME = "atolog-backup.json.gz";

/** バックアップを実行する */
export async function POST(_req: NextRequest): Promise<NextResponse> {
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
    const settings = await fetchUserSettings(userId);
    if (!settings || settings.plan === "free") {
        return NextResponse.json({ error: "Upgrade required" }, { status: 403 });
    }

    try {
        // 設定と記録を並列取得する
        const [records] = await Promise.all([
            fetchAllDayRecords(userId),
        ]);

        console.log(`[Relief] バックアップ: userId=${userId}, records=${records.length}件`);

        // plan は復元時に上書きしないため除外する
        const { plan: _plan, ...settingsWithoutPlan } = settings;

        const backup = {
            exportedAt: new Date().toISOString(),
            version:    "1.0",
            settings:   settingsWithoutPlan,
            records,
        };

        const jsonString = JSON.stringify(backup);
        // JSON を gzip 圧縮してファイルサイズを削減する
        const compressed = await gzipAsync(Buffer.from(jsonString, "utf-8"));

        const folderId = await getOrCreateAtologFolder(session.accessToken);
        const url      = await uploadBackupFile(
            session.accessToken,
            folderId,
            BACKUP_FILENAME,
            compressed,
            "application/gzip",
        );

        return NextResponse.json({ url });
    } catch (error) {
        console.error("[Relief] バックアップエラー:", error);
        return NextResponse.json({ error: "Backup failed" }, { status: 500 });
    }
}
