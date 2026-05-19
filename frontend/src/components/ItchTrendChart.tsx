"use client";

// かゆみ傾向グラフコンポーネント。
// かゆみスコア平均の折れ線グラフを表示します（月次/週次切り替え）。
// 週次モードは指定月の全週を表示し、月ナビゲーターで月を切り替えられます。

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "@/hooks/UseTranslations";
import { useAppStore } from "@/store/UseAppStore";
import type { ItchStatEntry } from "@/app/api/itch-stats/route";
import { ITCH_SCORE_ICONS } from "@/constants/AppConstants";

// 折れ線の色
const LINE_COLOR = "#007AFF";

// グラフの描画定数（SVG単位）。月次水分量グラフと同じ高さ系定数を使う
const GRAPH_HEIGHT = 100;
const PADDING_TOP = 16;
const PADDING_BOTTOM = 18; // X軸ラベル用
const PADDING_LEFT = 44;   // Y軸ラベル用（英語ラベルが長いため広めに確保）
const PADDING_RIGHT = 32;  // 右側パディング
const VIEW_WIDTH = 226;    // PADDING_LEFT + 描画幅(150) + PADDING_RIGHT

// 前月に移動する
function toPrevMonth(year: number, month: number): { year: number; month: number } {
    return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

// 翌月に移動する
function toNextMonth(year: number, month: number): { year: number; month: number } {
    return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

// ラベルを短く整形する（月次: "5月" / 週次: "5/5"）
function formatLabel(label: string, granularity: "monthly" | "weekly", locale: "ja" | "en"): string {
    if (granularity === "monthly") {
        const m = Number(label.slice(5, 7));
        return locale === "ja" ? `${m}月` : `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][m - 1]}`;
    }
    // "2026-05-05" → "5/5"
    const parts = label.split("-");
    return `${Number(parts[1])}/${Number(parts[2])}`;
}

export default function ItchTrendChart() {
    const t = useTranslations();
    const locale = useAppStore((s) => s.locale);

    const [granularity, setGranularity] = useState<"monthly" | "weekly">("monthly");
    const [data, setData] = useState<ItchStatEntry[]>([]);
    const [loading, setLoading] = useState(false);

    // 週次モード用の表示月（初期値は今月）
    const today = useMemo(() => {
        const now = new Date();
        return { year: now.getFullYear(), month: now.getMonth() + 1 };
    }, []);
    const [viewYear, setViewYear] = useState(today.year);
    const [viewMonth, setViewMonth] = useState(today.month);

    const isCurrentMonth = viewYear === today.year && viewMonth === today.month;

    useEffect(() => {
        setLoading(true);
        // 月次: 当年1〜12月固定。週次: 指定月の全週をAPIが自動生成する
        const url = granularity === "monthly"
            ? `/api/itch-stats?granularity=monthly`
            : `/api/itch-stats?granularity=weekly&year=${viewYear}&month=${viewMonth}`;
        fetch(url)
            .then((r) => r.json())
            .then((json: unknown) => {
                setData(Array.isArray(json) ? (json as ItchStatEntry[]) : []);
            })
            .catch(() => setData([]))
            .finally(() => setLoading(false));
    }, [granularity, viewYear, viewMonth]);

    // Y軸最大値はかゆみスコアの最大値である5に固定する
    const Y_MAX = 5;

    // X座標を計算する。データ点をビュー幅いっぱいに比例配置する
    const plotWidth = VIEW_WIDTH - PADDING_LEFT - PADDING_RIGHT;
    const xOf = (i: number) => {
        if (data.length <= 1) return PADDING_LEFT + plotWidth / 2;
        return PADDING_LEFT + (i / (data.length - 1)) * plotWidth;
    };

    // Y座標を計算する。Y_MAX を超える値は上端にクランプする
    const yOf = (value: number) =>
        PADDING_TOP + GRAPH_HEIGHT * (1 - Math.min(value, Y_MAX) / Y_MAX);

    const svgHeight = GRAPH_HEIGHT + PADDING_TOP + PADDING_BOTTOM;

    return (
        <div className="card" style={{ marginTop: "0" }}>
            {/* タイトルと月次/週次切り替え */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                <div className="section-label" style={{ margin: 0 }}>{t.itchChart.title}</div>
                <div style={{ display: "flex", gap: "4px" }}>
                    {(["monthly", "weekly"] as const).map((g) => (
                        <button
                            key={g}
                            onClick={() => setGranularity(g)}
                            style={{
                                padding: "4px 10px",
                                borderRadius: "var(--radius-pill)",
                                border: granularity === g
                                    ? "1.5px solid var(--color-accent)"
                                    : "1px solid var(--color-border)",
                                background: granularity === g
                                    ? "rgba(0,122,255,0.1)"
                                    : "var(--color-input-bg)",
                                color: granularity === g
                                    ? "var(--color-accent)"
                                    : "var(--color-text-muted)",
                                fontSize: "0.72rem",
                                fontWeight: granularity === g ? 600 : 400,
                                cursor: "pointer",
                                fontFamily: "inherit",
                            }}
                        >
                            {g === "monthly" ? t.itchChart.monthly : t.itchChart.weekly}
                        </button>
                    ))}
                </div>
            </div>

            {/* 週次モード: 月ナビゲーター */}
            {granularity === "weekly" && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                    <button
                        onClick={() => {
                            const p = toPrevMonth(viewYear, viewMonth);
                            setViewYear(p.year);
                            setViewMonth(p.month);
                        }}
                        style={{ border: "none", background: "none", cursor: "pointer", fontSize: "1.1rem", color: "var(--color-accent)", padding: "4px 8px" }}
                        aria-label={t.chart.prevMonth}
                    >
                        ‹
                    </button>
                    <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--color-text-primary)" }}>
                        {t.calendar.formatYearMonth(viewYear, viewMonth)}
                    </span>
                    <button
                        onClick={() => {
                            const n = toNextMonth(viewYear, viewMonth);
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
            )}

            {/* グラフ本体 */}
            {loading ? (
                <div style={{
                    height: "80px",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "var(--color-text-muted)", fontSize: "0.78rem",
                }}>
                    {t.common.loading}
                </div>
            ) : data.length === 0 ? (
                <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", textAlign: "center", margin: "16px 0" }}>
                    {t.itchChart.noData}
                </p>
            ) : (
                <svg
                    viewBox={`0 0 ${VIEW_WIDTH} ${svgHeight}`}
                    width="100%"
                    preserveAspectRatio="none"
                    style={{ display: "block", overflow: "visible" }}
                >
                    {/* Y軸ガイドライン（0〜5を1刻み） */}
                    {Array.from({ length: 6 }, (_, i) => i).map((tick) => {
                        const y = yOf(tick);
                        return (
                            <g key={tick}>
                                <line
                                    x1={PADDING_LEFT} y1={y}
                                    x2={VIEW_WIDTH - PADDING_RIGHT} y2={y}
                                    stroke="var(--color-border, #E5E5EA)"
                                    strokeWidth={0.5}
                                    opacity={0.7}
                                />
                                {/* 0: 未記録ラベル / 1〜5: アイコン＋ラベルを2行で表示 */}
                                {tick === 0 ? (
                                    <text
                                        x={PADDING_LEFT - 2}
                                        y={y + 2}
                                        textAnchor="end"
                                        fontSize={4}
                                        fontWeight="bold"
                                        fill="#000000"
                                    >
                                        {t.itch.noRecord}
                                    </text>
                                ) : (
                                    <g>
                                        <text
                                            x={PADDING_LEFT - 2}
                                            y={y + 2}
                                            textAnchor="end"
                                            fontSize={6}
                                        >
                                            {ITCH_SCORE_ICONS[tick]}
                                        </text>
                                        <text
                                            x={PADDING_LEFT - 2}
                                            y={y + 8}
                                            textAnchor="end"
                                            fontSize={4}
                                            fontWeight="bold"
                                            fill="#000000"
                                        >
                                            {t.itch.scoreLabels[tick - 1]}
                                        </text>
                                    </g>
                                )}
                            </g>
                        );
                    })}

                    {/* X軸ラベル */}
                    {data.map((entry, i) => {
                        // 点が多い場合は間引いて表示する
                        const showLabel = data.length <= 6 || i % 2 === 0 || i === data.length - 1;
                        return showLabel ? (
                            <text
                                key={entry.label}
                                x={xOf(i)}
                                y={PADDING_TOP + GRAPH_HEIGHT + PADDING_BOTTOM - 4}
                                textAnchor="middle"
                                fontSize={4}
                                fontWeight="bold"
                                fill="#000000"
                            >
                                {formatLabel(entry.label, granularity, locale)}
                            </text>
                        ) : null;
                    })}

                    {/* かゆみスコア平均の折れ線 */}
                    <polyline
                        points={data.map((entry, i) => `${xOf(i)},${yOf(entry.avgScore)}`).join(" ")}
                        fill="none"
                        stroke={LINE_COLOR}
                        strokeWidth={0.9}
                        strokeDasharray="4 2"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                    />
                    {/* データ点のドット（スコアが0より大きい場合のみ表示） */}
                    {data.map((entry, i) => entry.avgScore > 0 ? (
                        <circle
                            key={entry.label}
                            cx={xOf(i)}
                            cy={yOf(entry.avgScore)}
                            r={1.5}
                            fill={LINE_COLOR}
                        />
                    ) : null)}
                </svg>
            )}
        </div>
    );
}
