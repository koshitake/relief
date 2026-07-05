// NextAuth のセッション・JWT 型を拡張します。
// email は個人情報のため含めません。

import "next-auth";

declare module "next-auth" {
    interface Session {
        user: {
            /** users テーブルの UUID */
            id: string;
            /** Google アカウントの表示名（ニックネーム） */
            name: string;
            /** プロフィール画像の URL（未設定時は undefined） */
            avatarUrl?: string;
        };
        /** Google Drive API 用のアクセストークン */
        accessToken?: string;
        /** Google Drive の権限（drive.file スコープ）が付与されているか */
        hasDriveScope?: boolean;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        /** users テーブルの UUID */
        userId?: string;
        /** Google Drive API 用のアクセストークン */
        accessToken?: string;
        /** アクセストークンの期限（ms）*/
        accessTokenExpires?: number;
        /** アクセストークン更新用のリフレッシュトークン */
        refreshToken?: string;
        /** AI API 認証用のプラン値（0=Free / 10=Full） */
        plan?: number;
        /** プロフィール画像の URL */
        avatarUrl?: string;
    }
}
