// Google Drive へのバックアップ操作を提供する API Route です。
// GET: バックアップファイル一覧を取得する
// POST: 全データを JSON にしてバックアップする

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/AuthOptions";
import { fetchUserSettings } from "@/lib/UserSettingsRepository";
import { fetchAllDayRecords } from "@/lib/DayRecordRepository";
import { getOrCreateAtologFolder, uploadBackupFile, listBackupFiles } from "@/lib/GoogleDriveRepository";

/** バックアップファイル一覧を取得する */
export async function GET(): Promise<NextResponse> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Drive スコープが付与されていない場合は再サインインを促す
    if (!session.hasDriveScope || !session.accessToken) {
        return NextResponse.json({ error: "Drive scope not granted" }, { status: 403 });
    }

    try {
        const folderId = await getOrCreateAtologFolder(session.accessToken);
        const files = await listBackupFiles(session.accessToken, folderId);
        return NextResponse.json(files);
    } catch (error) {
        console.error("[Relief] バックアップ一覧取得エラー:", error);
        return NextResponse.json({ error: "Failed to list backup files" }, { status: 500 });
    }
}

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

        // plan は復元時に上書きしないため除外する
        const { plan: _plan, ...settingsWithoutPlan } = settings;

        const backup = {
            exportedAt: new Date().toISOString(),
            version:    "1.0",
            settings:   settingsWithoutPlan,
            records,
        };

        const content  = JSON.stringify(backup, null, 2);
        const today    = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        const filename = `atolog-backup-${today}.json`;

        const folderId = await getOrCreateAtologFolder(session.accessToken);
        const url      = await uploadBackupFile(session.accessToken, folderId, filename, content);

        return NextResponse.json({ url });
    } catch (error) {
        console.error("[Relief] バックアップエラー:", error);
        return NextResponse.json({ error: "Backup failed" }, { status: 500 });
    }
}
