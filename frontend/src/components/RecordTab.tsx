"use client";

// ダッシュボードコンポーネントです。
// 「今日のまとめ」と「入力」をボトムナビゲーションバーで切り替えます。

import { useAppStore } from "@/store/UseAppStore";
import { useDayRecord } from "@/hooks/UseDayRecord";
import { useUserSettings } from "@/hooks/UseUserSettings";
import SummaryCard from "./SummaryCard";
import MonthlyWaterChart from "./MonthlyWaterChart";
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
    const { record, updateRecord } = useDayRecord(day);
    const { saveWaterTargetMl } = useUserSettings();

    return (
        // rendering-conditional-render: ternary を使って && を避ける
        activeTab === "summary" ? (
            /* 今日のまとめタブ */
            <div role="tabpanel">
                <SummaryCard record={record} />
                <MonthlyWaterChart />
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
        )
    );
}
