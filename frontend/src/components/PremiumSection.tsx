"use client";

// 有料機能のプレースホルダーカードコンポーネントです。
// AI機能追加時に再利用する予定です。

interface PremiumSectionProps {
    /** セクションタイトル */
    title: string;
    /** 機能の説明文 */
    description: string;
}

export default function PremiumSection({ title, description }: PremiumSectionProps) {
    return (
        <div
            className="card"
            style={{
                textAlign: "center",
                padding: "32px 24px",
            }}
        >
            <div style={{ fontSize: "1.5rem", marginBottom: "10px" }}>🔒</div>
            <div
                style={{
                    fontSize: "1rem",
                    fontWeight: 600,
                    color: "var(--color-text-primary)",
                    marginBottom: "8px",
                }}
            >
                {title}
            </div>
            <div
                style={{
                    fontSize: "0.82rem",
                    color: "var(--color-text-muted)",
                    lineHeight: 1.7,
                }}
            >
                {description}
            </div>
        </div>
    );
}
