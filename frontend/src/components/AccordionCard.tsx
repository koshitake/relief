"use client";

// アコーディオン形式のカードコンポーネントです。
// タイトルをタップすると内容の開閉ができます。

import React, { useState, startTransition } from "react";

interface AccordionCardProps {
    title: string;
    defaultOpen?: boolean;
    // React 19 では children は props に自動的に含まれないため明示的に宣言する
    children: React.ReactNode;
}

export default function AccordionCard({ title, defaultOpen = false, children }: AccordionCardProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    function handleToggle() {
        startTransition(() => setIsOpen((prev: boolean) => !prev));
    }

    return (
        <div
            className="card"
            style={{ padding: 0, overflow: "hidden" }}
        >
            {/* ヘッダー（タップで開閉） */}
            <button
                onClick={handleToggle}
                aria-expanded={isOpen}
                style={{
                    width: "100%",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "14px 16px",
                    background: "none",
                    border: "none",
                    borderBottom: isOpen ? "1px solid var(--color-border)" : "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    textAlign: "left",
                }}
            >
                <span className="section-label" style={{ margin: 0 }}>
                    {title}
                </span>
                {/* 開閉状態を示す矢印 */}
                <span
                    style={{
                        fontSize: "0.7rem",
                        color: "var(--color-text-muted)",
                        display: "inline-block",
                        transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.2s ease",
                    }}
                >
                    ▼
                </span>
            </button>

            {/* コンテンツ（開いているときのみ表示） */}
            {isOpen && (
                <div style={{ padding: "14px 16px" }}>
                    {children}
                </div>
            )}
        </div>
    );
}
