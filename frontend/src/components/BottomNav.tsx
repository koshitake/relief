"use client";

// 画面下部に固定されるナビゲーションバーです。
// スクロール位置に関わらず常にタブ切替ができます。

import { useAppStore } from "@/store/UseAppStore";

export default function BottomNav() {
    const { activeTab, setActiveTab } = useAppStore();

    return (
        <nav className="bottom-nav" role="tablist" aria-label="メインナビゲーション">
            <button
                className={`bottom-nav-btn ${activeTab === "summary" ? "active" : ""}`}
                role="tab"
                aria-selected={activeTab === "summary"}
                onClick={() => setActiveTab("summary")}
            >
                <span className="bottom-nav-icon" aria-hidden="true">📊</span>
                <span className="bottom-nav-label">まとめ</span>
            </button>
            <button
                className={`bottom-nav-btn ${activeTab === "input" ? "active" : ""}`}
                role="tab"
                aria-selected={activeTab === "input"}
                onClick={() => setActiveTab("input")}
            >
                <span className="bottom-nav-icon" aria-hidden="true">✏️</span>
                <span className="bottom-nav-label">入力</span>
            </button>
        </nav>
    );
}
