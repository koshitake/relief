"use client";

// 認証状態を管理するカスタムフックです。
// NextAuth のセッションを使用します。
// ログイン時にニックネームを Zustand ストアへ同期します。

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useAppStore } from "@/store/UseAppStore";

interface AuthState {
    /** ログイン中のユーザー。未ログインの場合は null */
    user: { id: string; name: string } | null;
    /** セッション確認中かどうか */
    loading: boolean;
}

export function useAuth(): AuthState {
    const { data: session, status } = useSession();
    const setDisplayName = useAppStore((s) => s.setDisplayName);

    const loading = status === "loading";
    const user = session?.user?.id
        ? { id: session.user.id, name: session.user.name ?? "ユーザー" }
        : null;

    // セッションのニックネームをストアへ同期する（設定画面での即時更新のベースになる）
    useEffect(() => {
        if (session?.user?.name) {
            setDisplayName(session.user.name);
        } else if (status === "unauthenticated") {
            setDisplayName("");
        }
    }, [session?.user?.name, status, setDisplayName]);

    return { user, loading };
}
