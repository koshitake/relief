"use client";

// ダッシュボードコンポーネントです。
// 「今日のまとめ」（サマリー表示）と「入力」（記録フォーム）をセグメントコントロールで切り替えます。

import React, { useState, startTransition, useRef } from "react";
import { useAppStore } from "@/store/UseAppStore";
import { useDayRecord } from "@/hooks/UseDayRecord";
import { useUserSettings } from "@/hooks/UseUserSettings";
import SummaryCard from "./SummaryCard";
import ItchSection from "./ItchSection";
import WaterSection from "./WaterSection";
import ExerciseSection from "./ExerciseSection";
import NoteSection from "./NoteSection";
import MealsSection from "./MealsSection";
import AccordionCard from "./AccordionCard";

interface RecordTabProps {
    day: string;
}

// セグメントの種類
type TabKey = "summary" | "input";

export default function RecordTab({ day }: RecordTabProps) {
    const [activeTab, setActiveTab] = useState<TabKey>("summary");
    const { waterTargetMl } = useAppStore();
    const { record, updateRecord } = useDayRecord(day);
    const { saveWaterTargetMl } = useUserSettings();

    // スワイプ検出用: タッチ開始座標を保持する
    const touchStartX = useRef<number | null>(null);
    const touchStartY = useRef<number | null>(null);

    // タブ切替は非緊急更新なので startTransition で包む
    function handleTabChange(tab: TabKey) {
        startTransition(() => setActiveTab(tab));
    }

    function handleTouchStart(e: React.TouchEvent) {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
    }

    function handleTouchEnd(e: React.TouchEvent) {
        if (touchStartX.current === null || touchStartY.current === null) return;

        const deltaX = e.changedTouches[0].clientX - touchStartX.current;
        const deltaY = e.changedTouches[0].clientY - touchStartY.current;

        touchStartX.current = null;
        touchStartY.current = null;

        // 縦スクロールの場合はタブ切替しない
        if (Math.abs(deltaY) > Math.abs(deltaX)) return;

        const THRESHOLD = 60;
        if (deltaX > THRESHOLD && activeTab === "input") {
            // 右スワイプ → まとめタブへ
            handleTabChange("summary");
        } else if (deltaX < -THRESHOLD && activeTab === "summary") {
            // 左スワイプ → 入力タブへ
            handleTabChange("input");
        }
    }

    return (
        <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            {/* セグメントコントロール */}
            <div className="segment-control" role="tablist">
                <button
                    className={`segment-btn ${activeTab === "summary" ? "active" : ""}`}
                    role="tab"
                    aria-selected={activeTab === "summary"}
                    onClick={() => handleTabChange("summary")}
                >
                    今日のまとめ
                </button>
                <button
                    className={`segment-btn ${activeTab === "input" ? "active" : ""}`}
                    role="tab"
                    aria-selected={activeTab === "input"}
                    onClick={() => handleTabChange("input")}
                >
                    入力
                </button>
            </div>

            {/* rendering-conditional-render: ternary を使って && を避ける */}
            {activeTab === "summary" ? (
                /* 今日のまとめタブ */
                <div role="tabpanel">
                    <SummaryCard record={record} />
                </div>
            ) : (
                /* 入力タブ: 各記録フォームを表示 */
                <div
                    role="tabpanel"
                    style={{ display: "flex", flexDirection: "column", gap: "12px" }}
                >
                    {/* 毎日入力するセクション: 常に展開表示 */}
                    <WaterSection
                        record={record}
                        updateRecord={updateRecord}
                        waterTargetMl={waterTargetMl}
                        setWaterTargetMl={saveWaterTargetMl}
                    />

                    {/* 任意入力のセクション: デフォルト折りたたみ */}
                    <AccordionCard title="運動">
                        <ExerciseSection record={record} updateRecord={updateRecord} />
                    </AccordionCard>
                    <AccordionCard title="食事">
                        <MealsSection record={record} updateRecord={updateRecord} />
                    </AccordionCard>
                    <AccordionCard title="かゆみ">
                        <ItchSection record={record} updateRecord={updateRecord} />
                    </AccordionCard>
                    <AccordionCard title="メモ（症状・気づき）">
                        <NoteSection record={record} updateRecord={updateRecord} />
                    </AccordionCard>
                </div>
            )}
        </div>
    );
}
