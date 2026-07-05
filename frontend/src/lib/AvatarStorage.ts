// アバター画像のバリデーションとBase64 Data URL変換を行うユーティリティです。
// 変換後のData URLはDBに直接保存し、<img src> でそのまま表示できます。

const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

// MIME type ごとのマジックバイト（ファイル先頭のバイト列）
// クライアントが申告した MIME type を偽装していないかをバイナリレベルで確認するために使う
const MAGIC_BYTES: Record<AllowedMimeType, number[][]> = {
    "image/jpeg": [[0xFF, 0xD8, 0xFF]],
    "image/png":  [[0x89, 0x50, 0x4E, 0x47]],
    // WebP: 先頭 4 バイトが "RIFF" であることを確認する
    "image/webp": [[0x52, 0x49, 0x46, 0x46]],
};

function validateMagicBytes(buffer: Buffer, contentType: AllowedMimeType): void {
    const patterns = MAGIC_BYTES[contentType];
    const matched = patterns.some((magic) =>
        magic.every((byte, i) => buffer[i] === byte)
    );
    if (!matched) throw new Error("INVALID_MIME_TYPE");
}

/** ファイルサイズ・MIME type・マジックバイトを検証する。エラー時は例外を投げる */
export function validateAvatarFile(buffer: Buffer, contentType: string): AllowedMimeType {
    if (buffer.byteLength > MAX_AVATAR_SIZE_BYTES) {
        throw new Error("FILE_TOO_LARGE");
    }
    if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(contentType)) {
        throw new Error("INVALID_MIME_TYPE");
    }
    const mime = contentType as AllowedMimeType;
    // クライアントが送った MIME type の申告を信頼せず、実際のバイナリ形式を確認する
    validateMagicBytes(buffer, mime);
    return mime;
}

/** バリデーション済みのバッファをBase64 Data URLに変換する */
export function toDataUrl(buffer: Buffer, contentType: AllowedMimeType): string {
    return `data:${contentType};base64,${buffer.toString("base64")}`;
}
