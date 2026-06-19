"use client";

// 今日のまとめカードコンポーネントです。
// 水分・月次グラフ・運動・かゆみ/糖質/塩分を仕様の順で縦に並べて表示します。

import { DayRecord, calcTotalWaterMl } from "@/types/DayRecord";
import { MAX_ITCH_SCORE, ITCH_SCORE_ICONS } from "@/constants/AppConstants";
import { useAppStore } from "@/store/UseAppStore";
import { useTranslations } from "@/hooks/UseTranslations";
import MonthlyWaterChart from "./MonthlyWaterChart";
import ItchTrendChart from "./ItchTrendChart";

interface SummaryCardProps {
    record: DayRecord;
}

export default function SummaryCard({ record }: SummaryCardProps) {
    const waterTargetMl = useAppStore((s) => s.waterTargetMl);
    const carbsTargetG = useAppStore((s) => s.carbsTargetG);
    const saltTargetG = useAppStore((s) => s.saltTargetG);
    const proteinTargetG = useAppStore((s) => s.proteinTargetG);
    const t = useTranslations();
    const totalWaterMl = calcTotalWaterMl(record.waterLogs);
    const waterPercent = Math.min(100, Math.round((totalWaterMl / waterTargetMl) * 100));

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

            {/* 1. 水分（1枠） */}
            <div className="card">
                <div className="section-label">{t.summary.water}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "4px", margin: "6px 0 10px" }}>
                    <span style={{ fontSize: "2rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
                        {totalWaterMl.toLocaleString()}
                    </span>
                    <span style={{ fontSize: "0.9rem", color: "var(--color-text-muted)" }}>ml</span>
                    <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginLeft: "6px" }}>
                        / {waterTargetMl.toLocaleString()}ml
                    </span>
                </div>
                <div style={{ background: "var(--color-border)", borderRadius: "4px", height: "8px", overflow: "hidden" }}>
                    <div
                        style={{
                            width: `${waterPercent}%`,
                            height: "100%",
                            background: "var(--color-accent)",
                            borderRadius: "4px",
                            transition: "width 0.3s ease",
                        }}
                    />
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", marginTop: "4px", textAlign: "right" }}>
                    {waterPercent}%
                </div>
            </div>

            {/* 2. 月次水分グラフ（1枠） */}
            <MonthlyWaterChart />

            {/* 3. 運動（1枠） */}
            <div className="card">
                <div className="section-label">{t.summary.exercise}</div>
                <div style={{
                    fontSize: "0.9rem",
                    color: record.exerciseText?.trim() ? "var(--color-text-primary)" : "var(--color-text-muted)",
                    marginTop: "6px",
                }}>
                    {record.exerciseText?.trim() || t.summary.noRecord}
                </div>
            </div>

            {/* 4. かゆみ / 糖質 / 塩分 / タンパク質（1枠・4列） */}
            <div className="card">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "8px", textAlign: "center" }}>
                    <MetricColumn
                        label={t.summary.itch}
                        value={record.itchScore > 0 ? ITCH_SCORE_ICONS[record.itchScore] : "—"}
                        unit={record.itchScore > 0 ? t.itch.scoreLabels[record.itchScore - 1] : ""}
                        percent={(record.itchScore / MAX_ITCH_SCORE) * 100}
                        barColor="#FF3B30"
                    />
                    <MetricColumn
                        label={t.summary.carbs}
                        value={record.carbsG !== undefined ? record.carbsG : "—"}
                        unit="g"
                        percent={record.carbsG !== undefined ? (record.carbsG / carbsTargetG) * 100 : 0}
                        barColor="#FF9500"
                    />
                    <MetricColumn
                        label={t.summary.salt}
                        value={record.saltG !== undefined ? record.saltG : "—"}
                        unit="g"
                        percent={record.saltG !== undefined ? (record.saltG / saltTargetG) * 100 : 0}
                        barColor="#34C759"
                    />
                    <MetricColumn
                        label={t.summary.protein}
                        value={record.proteinG !== undefined ? record.proteinG : "—"}
                        unit="g"
                        percent={record.proteinG !== undefined ? (record.proteinG / proteinTargetG) * 100 : 0}
                        barColor="#5856D6"
                    />
                </div>
                {/* 選択されたかゆみ部位を表示する */}
                {record.itchArea.length > 0 ? (
                    <div style={{
                        marginTop: "8px",
                        paddingTop: "8px",
                        borderTop: "1px solid var(--color-border)",
                        fontSize: "0.72rem",
                        color: "var(--color-text-muted)",
                        textAlign: "left",
                    }}>
                        {record.itchArea.join("・")}
                    </div>
                ) : null}
            </div>

            {/* 5. かゆみ傾向グラフ（全プラン） */}
            <ItchTrendChart />
        </div>
    );
}

interface MetricColumnProps {
    label: string;
    value: string | number;
    unit: string;
    percent: number;
    barColor: string;
}

function MetricColumn({ label, value, unit, percent, barColor }: MetricColumnProps) {
    const clamped = Math.min(100, Math.max(0, percent));
    return (
        <div>
            <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", marginBottom: "4px" }}>
                {label}
            </div>
            <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
                {value}
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>{unit}</div>
            <div style={{
                background: "var(--color-border)",
                borderRadius: "4px",
                height: "4px",
                overflow: "hidden",
                marginTop: "6px",
            }}>
                <div style={{
                    width: `${clamped}%`,
                    height: "100%",
                    background: barColor,
                    borderRadius: "4px",
                }} />
            </div>
        </div>
    );
}
