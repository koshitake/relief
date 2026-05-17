"use client";

// 広告バナーコンポーネントです。
// isActive = false のとき、開発確認用のモック表示を行います。
// Google AdSense の審査通過後に isActive を true にして広告コードを差し込みます。

import { useTranslations } from "@/hooks/UseTranslations";
import { useAppStore } from "@/store/UseAppStore";

interface AdBannerProps {
    slot: "top" | "bottom";
}

// AdSense 審査通過後に true に変更し、<ins> タグを追加する
const IS_ACTIVE = false;

export default function AdBanner({ slot }: AdBannerProps) {
    const t = useTranslations();
    const plan = useAppStore((s) => s.plan);

    // Full プランは広告非表示
    if (plan === "full") return null;

    if (IS_ACTIVE) {
        return (
            <div data-slot={slot} style={{ width: "100%", margin: "8px 0" }}>
                {/* ここに AdSense の <ins> タグを差し込む */}
            </div>
        );
    }

    // 本番広告が未設定の間はモック表示（配置確認用）
    return (
        <div
            data-slot={slot}
            style={{
                width: "100%",
                height: "50px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "repeating-linear-gradient(135deg, #f5f5f7 0px, #f5f5f7 6px, #e8e8ed 6px, #e8e8ed 12px)",
                border: "1px dashed #c7c7cc",
                borderRadius: "var(--radius-input)",
                margin: "8px 0",
                padding: "0 12px",
                boxSizing: "border-box",
            }}
        >
            <span style={{ fontSize: "0.62rem", color: "#8e8e93", fontWeight: 600, letterSpacing: "0.05em" }}>
                {t.ad.label}
            </span>
            <span style={{ fontSize: "0.6rem", color: "#aeaeb2" }}>
                320 × 50（{slot}）
            </span>
        </div>
    );
}
