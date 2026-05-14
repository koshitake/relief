// Google Drive への操作をまとめたリポジトリです。
// サーバー側（API Route）からのみ呼び出すこと。

import { google } from "googleapis";

export interface BackupFileInfo {
    fileId: string;
    name: string;
    createdTime: string;
}

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
 * バックアップ JSON を Drive にアップロードする。
 * 同名ファイルが存在する場合は上書きする。
 * 返り値: アップロードしたファイルの webViewLink
 */
export async function uploadBackupFile(
    accessToken: string,
    folderId: string,
    filename: string,
    content: string,
): Promise<string> {
    const drive = createDriveClient(accessToken);
    const media = { mimeType: "application/json", body: content };

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
 * atolog フォルダ内のバックアップファイル一覧を取得する。
 * 作成日時の降順で返す。
 */
export async function listBackupFiles(
    accessToken: string,
    folderId: string,
): Promise<BackupFileInfo[]> {
    const drive = createDriveClient(accessToken);

    const { data } = await drive.files.list({
        q:       `'${folderId}' in parents and name contains 'atolog-backup' and trashed=false`,
        fields:  "files(id, name, createdTime)",
        orderBy: "createdTime desc",
    });

    return (data.files ?? []).map((f) => ({
        fileId:      f.id!,
        name:        f.name!,
        createdTime: f.createdTime!,
    }));
}

/**
 * 指定したファイルの内容をテキストで取得する。
 */
export async function downloadBackupFile(
    accessToken: string,
    fileId: string,
): Promise<string> {
    const drive = createDriveClient(accessToken);

    const res = await drive.files.get(
        { fileId, alt: "media" },
        { responseType: "text" },
    );

    return res.data as string;
}
