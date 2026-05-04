"use client";

// 認証状態を管理するカスタムフックです。
// NextAuth のセッションを使用します。

import { useSession } from "next-auth/react";

interface AuthState {
    /** ログイン中のユーザー。未ログインの場合は null */
    user: { id: string; name: string } | null;
    /** セッション確認中かどうか */
    loading: boolean;
}

export function useAuth(): AuthState {
    const { data: session, status } = useSession();

    const loading = status === "loading";
    const user = session?.user?.id
        ? { id: session.user.id, name: session.user.name ?? "ユーザー" }
        : null;

    return { user, loading };
}
