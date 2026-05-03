"use client";

// ダッシュボードコンポーネントです。
// 「今日のまとめ」（サマリー表示）と「入力」（記録フォーム）をセグメントコントロールで切り替えます。

import { useState, startTransition } from "react";
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

    // タブ切替は非緊急更新なので startTransition で包む
    function handleTabChange(tab: TabKey) {
        startTransition(() => setActiveTab(tab));
    }

    return (
        <div>
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
                /* 今日のまとめタブ: タップすると入力タブへ切り替わる */
                <div
                    role="tabpanel"
                    onClick={() => handleTabChange("input")}
                    style={{ cursor: "pointer" }}
                    aria-label="タップして入力画面へ"
                >
                    <SummaryCard record={record} />
                    <div
                        style={{
                            textAlign: "center",
                            fontSize: "0.75rem",
                            color: "var(--color-text-muted)",
                            marginTop: "8px",
                            paddingBottom: "4px",
                        }}
                    >
                        タップして入力 →
                    </div>
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
