"use client";

// アプリのヘッダーコンポーネントです。
// ブランド名・サブタイトル・認証ボタンを表示します。

import AuthButton from "@/components/AuthButton";
import { useTranslations } from "@/hooks/UseTranslations";

export default function AppHeader() {
    const t = useTranslations();
    return (
        <header style={{ paddingTop: "24px", paddingBottom: "12px" }}>
            {/* ブランド名 */}
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
                {t.header.tagline}
            </div>

            {/* Google ログイン・ログアウトボタン */}
            <AuthButton />
        </header>
    );
}
