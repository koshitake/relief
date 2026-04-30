"use client";

// 認証状態を管理するカスタムフックです。
// NextAuth.js のセッションからログイン中のユーザーを返します。

import { useSession } from "next-auth/react";

export interface AuthUser {
    /** Google の一意ユーザーID */
    id: string;
    /** メールアドレス */
    email: string;
    /** 表示名 */
    name?: string | null;
}

interface AuthState {
    /** ログイン中のユーザー。未ログインの場合は null */
    user: AuthUser | null;
    /** セッション取得中かどうか */
    loading: boolean;
}

export function useAuth(): AuthState {
    const { data: session, status } = useSession();

    const loading = status === "loading";

    // セッションからユーザー情報を取り出す
    const user: AuthUser | null =
        session?.user?.id && session?.user?.email
            ? {
                  id:    session.user.id,
                  email: session.user.email,
                  name:  session.user.name,
              }
            : null;

    return { user, loading };
}
