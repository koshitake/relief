"use client";

// アプリのヘッダーコンポーネントです。
// ブランド名・サブタイトル・セルフケア/免責チップ・認証ボタンを表示します。

import { User } from "@supabase/supabase-js";
import AuthButton from "@/components/AuthButton";

interface AppHeaderProps {
    user: User | null;
}

export default function AppHeader({ user }: AppHeaderProps) {
    return (
        <header style={{ paddingTop: "24px", paddingBottom: "12px" }}>
            {/* ブランド名（システムフォント） */}
            <div
                style={{
                    fontSize: "2.1rem",
                    fontWeight: 700,
                    color: "#1C1C1E",
                    letterSpacing: "-0.5px",
                    lineHeight: 1.1,
                }}
            >
                あとろぐ
            </div>

            {/* サブタイトル */}
            <div
                style={{
                    fontSize: "0.875rem",
                    color: "var(--color-text-muted)",
                    marginTop: "4px",
                    marginBottom: "12px",
                }}
            >
                アトピーのための毎日の記録をサポート
            </div>

            {/* Google ログイン・ログアウトボタン */}
            <AuthButton user={user} />
        </header>
    );
}
