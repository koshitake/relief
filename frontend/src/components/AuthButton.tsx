"use client";

// Google ログイン・ログアウトボタンコンポーネントです。
// NextAuth を使用します。メールアドレスは取得・表示しません。

import { useSession, signIn, signOut } from "next-auth/react";
import { useAppStore } from "@/store/UseAppStore";

export default function AuthButton() {
    const { data: session, status } = useSession();
    // 設定画面でニックネームを変更した場合に即時反映するためストアから取得する
    const displayName = useAppStore((s) => s.displayName);

    if (status === "loading") return null;

    if (session?.user) {
        return (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "10px" }}>
                {/* ストアのニックネームを表示（設定変更後に即時反映される） */}
                <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", flex: 1 }}>
                    {displayName || session.user.name}
                </span>
                <button
                    onClick={() => signOut()}
                    style={{
                        background: "none",
                        border: "1px solid rgba(0, 122, 255, 0.4)",
                        borderRadius: "var(--radius-pill)",
                        color: "var(--color-accent)",
                        fontSize: "0.75rem",
                        padding: "4px 12px",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        whiteSpace: "nowrap",
                    }}
                >
                    ログアウト
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={() => signIn("google")}
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                background: "none",
                border: "1px solid #DADCE0",
                borderRadius: "var(--radius-pill)",
                padding: "5px 12px",
                fontSize: "0.75rem",
                fontFamily: "inherit",
                color: "#3C4043",
                cursor: "pointer",
                marginTop: "10px",
            }}
        >
            {/* Google ロゴ（SVG） */}
            <svg width="14" height="14" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Google でログイン
        </button>
    );
}
