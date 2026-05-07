"use client";

// 画面下部に固定されるナビゲーションバーです。
// スクロール位置に関わらず常にタブ切替ができます。
// 「まとめ」「入力」はZustandで管理し、「設定」はNext.jsのページルーティングを使います。

import { usePathname, useRouter } from "next/navigation";
import { useAppStore } from "@/store/UseAppStore";

export default function BottomNav() {
    const pathname = usePathname();
    const router = useRouter();

    // セレクターで必要な値だけ購読し、他の状態変化による不要な再レンダリングを防ぐ
    const activeTab = useAppStore((s) => s.activeTab);
    const setActiveTab = useAppStore((s) => s.setActiveTab);

    const isSettings = pathname === "/settings";

    // まとめ・入力タブは / ページ。設定ページにいる場合はトップへ戻る
    function handleMainTabClick(tab: "summary" | "input") {
        if (isSettings) router.push("/");
        setActiveTab(tab);
    }

    return (
        <nav className="bottom-nav" role="tablist" aria-label="メインナビゲーション">
            <button
                className={`bottom-nav-btn ${!isSettings && activeTab === "summary" ? "active" : ""}`}
                role="tab"
                aria-selected={!isSettings && activeTab === "summary"}
                onClick={() => handleMainTabClick("summary")}
            >
                <span className="bottom-nav-icon" aria-hidden="true">📊</span>
                <span className="bottom-nav-label">まとめ</span>
            </button>
            <button
                className={`bottom-nav-btn ${!isSettings && activeTab === "input" ? "active" : ""}`}
                role="tab"
                aria-selected={!isSettings && activeTab === "input"}
                onClick={() => handleMainTabClick("input")}
            >
                <span className="bottom-nav-icon" aria-hidden="true">✏️</span>
                <span className="bottom-nav-label">入力</span>
            </button>
            <button
                className={`bottom-nav-btn ${isSettings ? "active" : ""}`}
                role="tab"
                aria-selected={isSettings}
                onClick={() => router.push("/settings")}
            >
                <span className="bottom-nav-icon" aria-hidden="true">⚙️</span>
                <span className="bottom-nav-label">設定</span>
            </button>
        </nav>
    );
}
