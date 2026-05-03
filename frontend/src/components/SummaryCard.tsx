"use client";

// 今日のサマリーカードコンポーネントです。
// かゆみ・水分・糖質・塩分の4指標をプログレスバー付きで表示します。
// 「今日のまとめ」というタイトルは呼び出し側のタブラベルで表示するため、このコンポーネントでは持ちません。

import { memo } from "react";
import { DayRecord, calcTotalWaterMl } from "@/types/DayRecord";
import { MAX_ITCH_SCORE, CARBS_TARGET_G, SALT_TARGET_G } from "@/constants/AppConstants";
import { useAppStore } from "@/store/UseAppStore";

interface SummaryCardProps {
    record: DayRecord;
}

interface MetricCardProps {
    label: string;
    value: string | number;
    unit: string;
    barPercent: number;
}

// rerender-memo: props が変わらない限り再レンダリングをスキップする
const MetricCard = memo(function MetricCard({ label, value, unit, barPercent }: MetricCardProps) {
    const clampedPercent = Math.min(100, Math.max(0, barPercent));

    return (
        <div className="metric-card">
            <div className="metric-card-accent" />
            <div className="metric-card-body">
                <div className="metric-label">{label}</div>
                <div className="metric-value">
                    {value}
                    <span className="metric-unit">{unit}</span>
                </div>
                <div className="metric-bar-track">
                    <div
                        className="metric-bar-fill"
                        style={{ width: `${clampedPercent}%` }}
                    />
                </div>
            </div>
        </div>
    );
});

export default function SummaryCard({ record }: SummaryCardProps) {
    const waterTargetMl = useAppStore((state) => state.waterTargetMl);
    const totalWaterMl = calcTotalWaterMl(record.waterLogs);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {/* かゆみ・水分・糖質・塩分 の4指標グリッド */}
            <div className="metric-grid">
                <MetricCard
                    label="かゆみ"
                    value={record.itchScore}
                    unit="/10"
                    barPercent={(record.itchScore / MAX_ITCH_SCORE) * 100}
                />
                <MetricCard
                    label="水分"
                    value={totalWaterMl.toLocaleString()}
                    unit="ml"
                    barPercent={(totalWaterMl / waterTargetMl) * 100}
                />
                <MetricCard
                    label="糖質"
                    value={record.carbsG !== undefined ? record.carbsG : "—"}
                    unit="g"
                    barPercent={record.carbsG !== undefined ? (record.carbsG / CARBS_TARGET_G) * 100 : 0}
                />
                <MetricCard
                    label="塩分"
                    value={record.saltG !== undefined ? record.saltG : "—"}
                    unit="g"
                    barPercent={record.saltG !== undefined ? (record.saltG / SALT_TARGET_G) * 100 : 0}
                />
            </div>

            {/* 運動内容（記録がある場合のみ表示） */}
            {record.exerciseText?.trim() ? (
                <div
                    className="card"
                    style={{
                        fontSize: "0.82rem",
                        color: "var(--color-text-secondary)",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "12px 14px",
                    }}
                >
                    <span>🏃</span>
                    <span>運動: {record.exerciseText}</span>
                </div>
            ) : null}
        </div>
    );
}
