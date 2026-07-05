"use client";

// 月次水分摂取グラフコンポーネントです。
// SVG で棒グラフを描画し、平均・最大・最小の統計を表示します。

import { useState, useEffect, useMemo } from "react";
import { useAppStore } from "@/store/UseAppStore";
import { useTranslations } from "@/hooks/UseTranslations";

interface DayData {
    day: string;
    totalMl: number;
}

// 指定年月の末日を返す
function getDaysInMonth(year: number, month: number): number {
    return new Date(year, month, 0).getDate();
}

// 今月の年・月を返す
function getCurrentYearMonth(): { year: number; month: number } {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

// 前月に移動する
function prevMonth(year: number, month: number): { year: number; month: number } {
    return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

// 翌月に移動する
function nextMonth(year: number, month: number): { year: number; month: number } {
    return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

// グラフの描画定数
const GRAPH_HEIGHT = 100;
const GRAPH_PADDING_TOP = 16;    // 目標ラインラベル用
const GRAPH_PADDING_BOTTOM = 18; // X軸ラベル用
const GRAPH_PADDING_LEFT = 24;   // Y軸ラベル用
const BAR_GAP = 1;

export default function MonthlyWaterChart() {
    const waterTargetMl = useAppStore((s) => s.waterTargetMl);
    const t = useTranslations();
    const today = getCurrentYearMonth();

    const [viewYear, setViewYear] = useState(today.year);
    const [viewMonth, setViewMonth] = useState(today.month);
    const [data, setData] = useState<DayData[]>([]);
    const [loading, setLoading] = useState(false);

    const isCurrentMonth = viewYear === today.year && viewMonth === today.month;
    const daysInMonth = getDaysInMonth(viewYear, viewMonth);

    // 月が変わるたびにAPIからデータを取得する
    useEffect(() => {
        setLoading(true);
        fetch(`/api/records/month?year=${viewYear}&month=${viewMonth}`)
            .then((r) => r.json())
            .then((json: DayData[]) => {
                setData(Array.isArray(json) ? json : []);
            })
            .catch(() => setData([]))
            .finally(() => setLoading(false));
    }, [viewYear, viewMonth]);

    // 日付 → 合計水分量のマップ（高速ルックアップ用）
    const dataMap = useMemo(() => {
        const map = new Map<number, number>();
        data.forEach((d) => {
            const day = Number(d.day.split("-")[2]);
            map.set(day, d.totalMl);
        });
        return map;
    }, [data]);

    // 統計（記録がある日のみ対象）
    const stats = useMemo(() => {
        const values = data.map((d) => d.totalMl);
        if (values.length === 0) return null;
        const avg = Math.round(values.reduce((s, v) => s + v, 0) / values.length);
        const max = Math.max(...values);
        const min = Math.min(...values);
        return { avg, max, min };
    }, [data]);

    // グラフのスケール計算（最大値は目標値かデータ最大値の大きい方）
    const scaleMax = useMemo(() => {
        const dataMax = data.length > 0 ? Math.max(...data.map((d) => d.totalMl)) : 0;
        return Math.max(dataMax, waterTargetMl, 1);
    }, [data, waterTargetMl]);

    // Y軸の目盛り（500ml 単位で scaleMax まで生成）
    const yAxisTicks = useMemo(() => {
        const ticks: { label: string; y: number }[] = [];
        for (let ml = 0; ml <= scaleMax; ml += 500) {
            ticks.push({
                label: ml === 0 ? "0" : `${ml / 1000 >= 1 ? `${ml / 1000}L` : `${ml}`}`,
                y: GRAPH_PADDING_TOP + GRAPH_HEIGHT * (1 - ml / scaleMax),
            });
        }
        return ticks;
    }, [scaleMax]);

    const barWidth = 2;
    // 左右に同量のパディングを設けて棒グラフエリアをセンタリングする
    const totalWidth = GRAPH_PADDING_LEFT + daysInMonth * (barWidth + BAR_GAP * 2) + GRAPH_PADDING_LEFT;

    // 目標ラインの Y 座標
    const targetY = GRAPH_PADDING_TOP + GRAPH_HEIGHT * (1 - waterTargetMl / scaleMax);

    return (
        <div className="card" style={{ marginTop: "12px" }}>
            <div className="section-label">{t.chart.title}</div>

            {/* 月ナビゲーション */}
            <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "12px",
            }}>
                <button
                    onClick={() => {
                        const p = prevMonth(viewYear, viewMonth);
                        setViewYear(p.year);
                        setViewMonth(p.month);
                    }}
                    style={{
                        border: "none", background: "none", cursor: "pointer",
                        fontSize: "1.1rem", color: "var(--color-accent)",
                        padding: "4px 8px",
                    }}
                    aria-label={t.chart.prevMonth}
                >
                    ‹
                </button>
                <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--color-text-primary)" }}>
                    {t.chart.formatYearMonth(viewYear, viewMonth)}
                </span>
                <button
                    onClick={() => {
                        if (isCurrentMonth) return;
                        const n = nextMonth(viewYear, viewMonth);
                        setViewYear(n.year);
                        setViewMonth(n.month);
                    }}
                    disabled={isCurrentMonth}
                    style={{
                        border: "none", background: "none",
                        cursor: isCurrentMonth ? "default" : "pointer",
                        fontSize: "1.1rem",
                        color: isCurrentMonth ? "var(--color-text-muted)" : "var(--color-accent)",
                        padding: "4px 8px",
                        opacity: isCurrentMonth ? 0.3 : 1,
                    }}
                    aria-label={t.chart.nextMonth}
                >
                    ›
                </button>
            </div>

            {/* SVG 棒グラフ */}
            {loading ? (
                <div style={{
                    height: `${GRAPH_HEIGHT + GRAPH_PADDING_TOP + GRAPH_PADDING_BOTTOM}px`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "var(--color-text-muted)", fontSize: "0.78rem",
                }}>
                    {t.chart.loading}
                </div>
            ) : (
                <svg
                    viewBox={`0 0 ${totalWidth} ${GRAPH_HEIGHT + GRAPH_PADDING_TOP + GRAPH_PADDING_BOTTOM}`}
                    width="100%"
                    preserveAspectRatio="none"
                    style={{ display: "block", overflow: "visible" }}
                    aria-label={t.chart.formatAriaLabel(viewYear, viewMonth)}
                >
                    <defs>
                        {/* 棒グラフのグラデーション塗りつぶし */}
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#D96B5F" stopOpacity={0.9}/>
                            <stop offset="100%" stopColor="#D96B5F" stopOpacity={0.45}/>
                        </linearGradient>
                    </defs>

                    {/* Y軸グリッドライン（コーラル系・破線） */}
                    {yAxisTicks.map(({ label, y }) => (
                        <g key={label}>
                            <line
                                x1={GRAPH_PADDING_LEFT}
                                y1={y}
                                x2={totalWidth - GRAPH_PADDING_LEFT}
                                y2={y}
                                stroke="rgba(217,107,95,0.2)"
                                strokeWidth={0.4}
                                strokeDasharray="3 3"
                            />
                            <text
                                x={GRAPH_PADDING_LEFT - 2}
                                y={y + 2}
                                textAnchor="end"
                                fontSize={4.5}
                                fontWeight="600"
                                fill="rgba(217,107,95,0.55)"
                            >
                                {label}
                            </text>
                        </g>
                    ))}

                    {/* 目標ライン（破線）とラベル */}
                    <line
                        x1={GRAPH_PADDING_LEFT}
                        y1={targetY}
                        x2={totalWidth - GRAPH_PADDING_LEFT}
                        y2={targetY}
                        stroke="rgba(255,59,48,0.6)"
                        strokeWidth={0.5}
                        strokeDasharray="2 1.5"
                    />
                    <text
                        x={GRAPH_PADDING_LEFT - 2}
                        y={targetY + 2}
                        textAnchor="end"
                        fontSize={4.5}
                        fill="rgba(255,59,48,0.85)"
                        fontWeight="600"
                    >
                        目標
                    </text>

                    {/* 各日のバー（グラデーション塗りつぶし・丸角） */}
                    {Array.from({ length: daysInMonth }, (_, i) => {
                        const dayNum = i + 1;
                        const ml = dataMap.get(dayNum) ?? 0;
                        const barH = ml > 0 ? Math.max(2, (ml / scaleMax) * GRAPH_HEIGHT) : 0;
                        const x = GRAPH_PADDING_LEFT + i * (barWidth + BAR_GAP * 2) + BAR_GAP;
                        const y = GRAPH_PADDING_TOP + GRAPH_HEIGHT - barH;
                        const fill = ml === 0 ? "transparent" : "url(#barGradient)";

                        return (
                            <g key={dayNum}>
                                <rect
                                    x={x}
                                    y={y}
                                    width={barWidth}
                                    height={barH}
                                    fill={fill}
                                    rx={1}
                                />
                                {/* 5日ごとに日付ラベルを表示 */}
                                {(dayNum === 1 || dayNum % 5 === 0) ? (
                                    <text
                                        x={x + barWidth / 2}
                                        y={GRAPH_PADDING_TOP + GRAPH_HEIGHT + GRAPH_PADDING_BOTTOM - 4}
                                        textAnchor="middle"
                                        fontSize={3}
                                        fill="rgba(217,107,95,0.5)"
                                    >
                                        {dayNum}
                                    </text>
                                ) : null}
                            </g>
                        );
                    })}
                </svg>
            )}

            {/* 凡例 */}
            <div style={{ display: "flex", gap: "12px", marginTop: "6px", marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: "#D96B5F" }} />
                    <span style={{ fontSize: "0.68rem", color: "var(--color-text-muted)" }}>{t.chart.legend}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <div style={{ width: "12px", height: "1px", background: "rgba(255,59,48,0.7)", borderTop: "1px dashed rgba(255,59,48,0.7)" }} />
                    <span style={{ fontSize: "0.68rem", color: "var(--color-text-muted)" }}>{t.chart.formatTargetLabel(waterTargetMl)}</span>
                </div>
            </div>

            {/* 統計カード */}
            {stats !== null ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                    {[
                        { label: t.chart.avg, value: stats.avg },
                        { label: t.chart.max, value: stats.max },
                        { label: t.chart.min, value: stats.min },
                    ].map(({ label, value }) => (
                        <div
                            key={label}
                            style={{
                                background: "var(--color-input-bg)",
                                borderRadius: "var(--radius-input)",
                                padding: "10px 8px",
                                textAlign: "center",
                            }}
                        >
                            <div style={{ fontSize: "0.65rem", color: "var(--color-text-muted)", marginBottom: "4px" }}>
                                {label}
                            </div>
                            <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--color-text-primary)", lineHeight: 1 }}>
                                {value.toLocaleString()}
                            </div>
                            <div style={{ fontSize: "0.62rem", color: "var(--color-text-muted)", marginTop: "2px" }}>
                                ml
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", textAlign: "center", margin: "8px 0 0" }}>
                    {t.chart.noData}
                </p>
            )}
        </div>
    );
}
