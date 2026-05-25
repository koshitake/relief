"use client";

// 未ログイン時に表示するアプリ説明画面です。（仮UI）
// アプリの概要と Google ログインボタンを表示します。

import { signIn } from "next-auth/react";
import { useTranslations } from "@/hooks/UseTranslations";

const FEATURES = [
    { icon: "📅", text: "日次のかゆみ・水分・食事・運動を記録" },
    { icon: "📊", text: "かゆみ傾向グラフで症状の変化を可視化" },
    { icon: "🌤", text: "当日の天気・気温・湿度を自動表示" },
    { icon: "🩺", text: "主治医向けレポートを作成（Fullプラン）" },
];

export default function LandingPage() {
    const t = useTranslations();

    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "80vh",
            padding: "32px 24px",
            textAlign: "center",
            gap: "0",
        }}>
            {/* アプリ名 */}
            <div style={{ fontSize: "3rem", fontWeight: 700, color: "var(--color-text-primary)", letterSpacing: "-1px", lineHeight: 1 }}>
                あとろぐ
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginTop: "6px", marginBottom: "32px" }}>
                {t.header.tagline}
            </div>

            {/* 機能紹介 */}
            <div className="card" style={{ width: "100%", maxWidth: "360px", textAlign: "left", marginBottom: "24px" }}>
                <div className="section-label" style={{ marginBottom: "12px" }}>主な機能</div>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "10px" }}>
                    {FEATURES.map((f) => (
                        <li key={f.text} style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "0.88rem", color: "var(--color-text-primary)" }}>
                            <span style={{ fontSize: "1.1rem", lineHeight: 1.4, flexShrink: 0 }}>{f.icon}</span>
                            <span>{f.text}</span>
                        </li>
                    ))}
                </ul>
            </div>

            {/* ログインボタン */}
            <button
                onClick={() => signIn("google")}
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    width: "100%",
                    maxWidth: "360px",
                    background: "var(--color-accent)",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: "var(--radius-pill)",
                    padding: "14px 24px",
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    fontFamily: "inherit",
                    cursor: "pointer",
                    marginBottom: "16px",
                }}
            >
                {/* Google ロゴ（SVG） */}
                <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                    <path fill="#ffffff" fillOpacity="0.9" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#ffffff" fillOpacity="0.9" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#ffffff" fillOpacity="0.9" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#ffffff" fillOpacity="0.9" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                {t.auth.login}
            </button>

            {/* 免責 */}
            <p style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", lineHeight: 1.6, maxWidth: "360px" }}>
                {t.common.disclaimer}
            </p>
        </div>
    );
}
