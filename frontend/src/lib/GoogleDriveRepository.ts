// Google Drive への操作をまとめたリポジトリです。
// サーバー側（API Route）からのみ呼び出すこと。

import { google } from "googleapis";
import { Readable } from "stream";

// アクセストークンをセットした Drive クライアントを生成する
function createDriveClient(accessToken: string) {
    const auth = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
    );
    auth.setCredentials({ access_token: accessToken });
    return google.drive({ version: "v3", auth });
}

/**
 * "atolog" フォルダの ID を取得する。
 * 存在しない場合は Drive ルートに作成して ID を返す。
 */
export async function getOrCreateAtologFolder(accessToken: string): Promise<string> {
    const drive = createDriveClient(accessToken);

    const { data } = await drive.files.list({
        q:      "name='atolog' and mimeType='application/vnd.google-apps.folder' and trashed=false",
        fields: "files(id)",
        spaces: "drive",
    });

    if (data.files && data.files.length > 0) {
        return data.files[0].id!;
    }

    const folder = await drive.files.create({
        requestBody: {
            name:     "atolog",
            mimeType: "application/vnd.google-apps.folder",
        },
        fields: "id",
    });

    return folder.data.id!;
}

/**
 * バックアップファイルを Drive にアップロードする。
 * content は文字列または Buffer（gzip 圧縮済みなど）を受け付ける。
 * 同名ファイルが存在する場合は上書きする。
 * 返り値: アップロードしたファイルの webViewLink
 */
export async function uploadBackupFile(
    accessToken: string,
    folderId: string,
    filename: string,
    content: string | Buffer,
    mimeType = "application/json",
): Promise<string> {
    const drive = createDriveClient(accessToken);
    // googleapis の body には Readable を渡す（Buffer は Readable.from で変換）
    const body = content instanceof Buffer ? Readable.from(content) : content;
    const media = { mimeType, body };

    // 同名ファイルを検索して上書き or 新規作成する
    const { data: existing } = await drive.files.list({
        q:      `name='${filename}' and '${folderId}' in parents and trashed=false`,
        fields: "files(id)",
    });

    if (existing.files && existing.files.length > 0) {
        const updated = await drive.files.update({
            fileId: existing.files[0].id!,
            media,
            fields: "webViewLink",
        });
        return updated.data.webViewLink ?? "";
    }

    const created = await drive.files.create({
        requestBody: { name: filename, parents: [folderId] },
        media,
        fields: "webViewLink",
    });
    return created.data.webViewLink ?? "";
}

/**
 * atolog フォルダ内の固定バックアップファイルの ID を返す。
 * ファイルが存在しない場合は null を返す。
 */
export async function findBackupFile(
    accessToken: string,
    folderId: string,
): Promise<string | null> {
    const drive = createDriveClient(accessToken);

    const { data } = await drive.files.list({
        q:      `name='atolog-backup.json.gz' and '${folderId}' in parents and trashed=false`,
        fields: "files(id)",
    });

    return data.files?.[0]?.id ?? null;
}

/**
 * 指定したファイルの内容を Buffer で取得する。
 * gzip 圧縮ファイルも raw bytes のまま返す（展開は呼び出し側で行う）。
 */
export async function downloadBackupFile(
    accessToken: string,
    fileId: string,
): Promise<Buffer> {
    const drive = createDriveClient(accessToken);

    const res = await drive.files.get(
        { fileId, alt: "media" },
        { responseType: "arraybuffer" },
    );

    return Buffer.from(res.data as ArrayBuffer);
}
