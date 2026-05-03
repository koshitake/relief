"use client";

// 認証状態を管理するカスタムフックです。
// Supabase Auth のセッションを監視し、ログイン中のユーザーを返します。

import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import supabase from "@/lib/SupabaseClient";

interface AuthState {
    /** ログイン中のユーザー。未ログインの場合は null */
    user: User | null;
    /** セッション取得中かどうか */
    loading: boolean;
}

export function useAuth(): AuthState {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Supabase 未設定（DBなしモード）の場合はローディングのみ解除する
        if (!supabase) {
            setLoading(false);
            return;
        }

        // 初期セッションを取得する
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            setLoading(false);
        });

        // ログイン・ログアウト時のセッション変更を監視する
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => setUser(session?.user ?? null)
        );

        return () => subscription.unsubscribe();
    }, []);

    return { user, loading };
}
