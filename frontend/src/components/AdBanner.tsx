"use client";

// 広告バナーコンポーネントです。
// ボトムナビゲーションバーの直上に固定表示されます。
// Google AdSense の審査通過後に isActive を true にして広告コードを差し込みます。

import { useTranslations } from "@/hooks/UseTranslations";
import { useAppStore } from "@/store/UseAppStore";
import { useAuth } from "@/hooks/UseAuth";

// AdSense 審査通過後に true に変更し、<ins> タグを追加する
const IS_ACTIVE = false;

export default function AdBanner() {
    const t = useTranslations();
    const plan = useAppStore((s) => s.plan);
    const { user } = useAuth();

    // 未ログイン時は広告バナーを非表示にする（ボトムナビが存在しないため位置がずれるため）
    if (!user) return null;

    // Full プランは広告非表示
    if (plan === "full") return null;

    // ボトムナビ直上に固定するスタイル
    const fixedStyle: React.CSSProperties = {
        position: "fixed",
        bottom: "calc(var(--bottom-nav-height) + env(safe-area-inset-bottom))",
        left: 0,
        right: 0,
        maxWidth: "480px",
        margin: "0 auto",
        zIndex: 99,
        height: "var(--ad-banner-height)",
        boxSizing: "border-box",
    };

    if (IS_ACTIVE) {
        return (
            <div style={fixedStyle}>
                {/* ここに AdSense の <ins> タグを差し込む */}
            </div>
        );
    }

    // 本番広告が未設定の間はモック表示（配置確認用）
    return (
        <div
            style={{
                ...fixedStyle,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "repeating-linear-gradient(135deg, #f5f5f7 0px, #f5f5f7 6px, #e8e8ed 6px, #e8e8ed 12px)",
                borderTop: "1px solid #c7c7cc",
                padding: "0 12px",
            }}
        >
            <span style={{ fontSize: "0.62rem", color: "#8e8e93", fontWeight: 600, letterSpacing: "0.05em" }}>
                {t.ad.label}
            </span>
            <span style={{ fontSize: "0.6rem", color: "#aeaeb2" }}>
                320 × 50
            </span>
        </div>
    );
}
