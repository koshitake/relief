"use client";

// 認証状態を管理するカスタムフックです。
// NextAuth のセッションを使用します。
// ログイン時にニックネームと各種設定を Zustand ストアへ同期します。

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
    const setDisplayName    = useAppStore((s) => s.setDisplayName);
    const setPlan           = useAppStore((s) => s.setPlan);
    const setLocale         = useAppStore((s) => s.setLocale);
    const setWaterTargetMl  = useAppStore((s) => s.setWaterTargetMl);
    const setCarbsTargetG   = useAppStore((s) => s.setCarbsTargetG);
    const setSaltTargetG    = useAppStore((s) => s.setSaltTargetG);
    const setProteinTargetG = useAppStore((s) => s.setProteinTargetG);

    const loading = status === "loading";
    const userId = session?.user?.id;
    const user = userId
        ? { id: userId, name: session.user.name ?? "ユーザー" }
        : null;

    // セッションのニックネームをストアへ同期する（設定画面での即時更新のベースになる）
    useEffect(() => {
        if (session?.user?.name) {
            setDisplayName(session.user.name);
        } else if (status === "unauthenticated") {
            setDisplayName("");
        }
    }, [session?.user?.name, status, setDisplayName]);

    // ログイン後、どのページでも正しいプラン・言語・目標値が反映されるよう
    // DBからユーザー設定を読み込んでストアに反映する。
    // userId が変わったとき（ログイン・ログアウト）のみ実行する。
    useEffect(() => {
        if (!userId) return;
        fetch("/api/settings")
            .then((r) => r.json())
            .then((data: {
                waterTargetMl?: number;
                carbsTargetG?: number;
                saltTargetG?: number;
                proteinTargetG?: number;
                locale?: "ja" | "en";
                plan?: "free" | "full";
            } | null) => {
                if (data?.waterTargetMl)  setWaterTargetMl(data.waterTargetMl);
                if (data?.carbsTargetG)   setCarbsTargetG(data.carbsTargetG);
                if (data?.saltTargetG)    setSaltTargetG(data.saltTargetG);
                if (data?.proteinTargetG) setProteinTargetG(data.proteinTargetG);
                if (data?.locale)         setLocale(data.locale);
                if (data?.plan)           setPlan(data.plan);
            })
            .catch(() => {});
    }, [userId, setPlan, setLocale, setWaterTargetMl, setCarbsTargetG, setSaltTargetG, setProteinTargetG]);

    return { user, loading };
}
