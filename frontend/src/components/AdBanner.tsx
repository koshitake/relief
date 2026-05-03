"use client";

// 広告バナーのプレースホルダーコンポーネントです。
// Google AdSense の審査通過後に isActive を true にして広告コードを差し込みます。

interface AdBannerProps {
    slot: "top" | "bottom";
}

export default function AdBanner({ slot }: AdBannerProps) {
    // AdSense 審査通過後に true に変更し、<ins> タグを追加する
    const isActive = false;

    if (!isActive) return null;

    return (
        <div
            data-slot={slot}
            style={{
                width: "100%",
                minHeight: "50px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--color-input-bg)",
                borderRadius: "var(--radius-input)",
                margin: "8px 0",
                fontSize: "0.7rem",
                color: "var(--color-text-muted)",
            }}
        >
            {/* ここに AdSense の <ins> タグを差し込む */}
        </div>
    );
}
