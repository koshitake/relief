"use client";

// ダッシュボードコンポーネントです。
// 「今日のまとめ」と「入力」をボトムナビゲーションバーで切り替えます。

import { useAppStore } from "@/store/UseAppStore";
import { useDayRecord } from "@/hooks/UseDayRecord";
import { useUserSettings } from "@/hooks/UseUserSettings";
import { useTranslations } from "@/hooks/UseTranslations";
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

export default function RecordTab({ day }: RecordTabProps) {
    // セレクターで必要な値だけ購読し、他の状態変化による不要な再レンダリングを防ぐ
    const waterTargetMl = useAppStore((s) => s.waterTargetMl);
    const activeTab = useAppStore((s) => s.activeTab);
    const { record, updateRecord, saveRecord, isSaving, isSaved, isDirty } = useDayRecord(day);
    const { saveWaterTargetMl } = useUserSettings();
    const t = useTranslations();

    return (
        // rendering-conditional-render: ternary を使って && を避ける
        activeTab === "summary" ? (
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
                <AccordionCard title={t.record.exercise}>
                    <ExerciseSection record={record} updateRecord={updateRecord} />
                </AccordionCard>
                <AccordionCard title={t.record.meals}>
                    <MealsSection record={record} updateRecord={updateRecord} />
                </AccordionCard>
                <AccordionCard title={t.record.itch}>
                    <ItchSection record={record} updateRecord={updateRecord} />
                </AccordionCard>
                <AccordionCard title={t.record.note}>
                    <NoteSection record={record} updateRecord={updateRecord} />
                </AccordionCard>

                {/* 保存ボタン（3状態: 未変更 / 未保存 / 保存済み） */}
                <div style={{ paddingBottom: "8px" }}>
                    <button
                        onClick={saveRecord}
                        disabled={isSaving || !isDirty}
                        style={{
                            width: "100%",
                            height: "50px",
                            borderRadius: "14px",
                            border: "none",
                            background: isSaving
                                ? "#C7C7CC"
                                : isSaved
                                ? "#34C759"
                                : isDirty
                                ? "#007AFF"
                                : "#C7C7CC",
                            color: "#fff",
                            fontSize: "1rem",
                            fontWeight: 700,
                            cursor: isSaving || !isDirty ? "not-allowed" : "pointer",
                            transition: "background 0.3s",
                            fontFamily: "inherit",
                        }}
                    >
                        {isSaving
                            ? t.record.saving
                            : isSaved
                            ? `✓ ${t.record.saved}`
                            : isDirty
                            ? `● ${t.record.save}`
                            : t.record.save}
                    </button>
                </div>
            </div>
        )
    );
}
