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
        };
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        /** users テーブルの UUID */
        userId?: string;
    }
}
