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
const LINE_COLOR = "#D96B5F";

// グラフの描画定数（SVG単位）
const GRAPH_HEIGHT = 100;
const PADDING_TOP = 16;
const PADDING_BOTTOM = 18; // X軸ラベル用
const PADDING_LEFT = 40;   // Y軸アイコン＋ラベル用
const PADDING_RIGHT = 12;  // 右側パディング
const VIEW_WIDTH = 202;    // PADDING_LEFT + 描画幅(150) + PADDING_RIGHT

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

    // 記録あり（avgScore > 0）の点を連続するセグメントに分割する。
    // 記録なし（avgScore === 0）の点はセグメントを切断するため線を結ばない。
    const lineSegments = useMemo(() => {
        const segments: number[][] = [];
        let current: number[] = [];
        data.forEach((entry, i) => {
            if (entry.avgScore > 0) {
                current.push(i);
            } else if (current.length > 0) {
                segments.push(current);
                current = [];
            }
        });
        if (current.length > 0) segments.push(current);
        return segments;
    }, [data]);

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
                                    ? "rgba(217,107,95,0.1)"
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
                    <defs>
                        {/* 線の下のグラデーション塗りつぶし */}
                        <linearGradient id="itchAreaGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={LINE_COLOR} stopOpacity={0.22}/>
                            <stop offset="100%" stopColor={LINE_COLOR} stopOpacity={0}/>
                        </linearGradient>
                    </defs>

                    {/* 水平グリッドライン＋Y軸アイコン（スコア 1〜5） */}
                    {[1, 2, 3, 4, 5].map((tick) => {
                        const y = yOf(tick);
                        return (
                            <g key={tick}>
                                <line
                                    x1={PADDING_LEFT} y1={y}
                                    x2={VIEW_WIDTH - PADDING_RIGHT} y2={y}
                                    stroke="rgba(217,107,95,0.2)"
                                    strokeWidth={0.5}
                                    strokeDasharray="3 3"
                                />
                                {/* 顔アイコン */}
                                <text
                                    x={PADDING_LEFT - 14}
                                    y={y + 2.5}
                                    textAnchor="middle"
                                    fontSize={7}
                                >
                                    {ITCH_SCORE_ICONS[tick]}
                                </text>
                                {/* スコアラベル */}
                                <text
                                    x={PADDING_LEFT - 2}
                                    y={y + 8}
                                    textAnchor="end"
                                    fontSize={4}
                                    fontWeight="600"
                                    fill="rgba(217,107,95,0.6)"
                                >
                                    {t.itch.scoreLabels[tick - 1]}
                                </text>
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
                                fill="rgba(217,107,95,0.5)"
                            >
                                {formatLabel(entry.label, granularity, locale)}
                            </text>
                        ) : null;
                    })}

                    {/* グラデーションエリア塗りつぶし（線より先に描画して線で上書き） */}
                    {lineSegments.map((indices, si) => {
                        if (indices.length < 1) return null;
                        const firstX = xOf(indices[0]);
                        const lastX = xOf(indices[indices.length - 1]);
                        const bottomY = PADDING_TOP + GRAPH_HEIGHT;
                        const linePts = indices.map((i) => `${xOf(i)},${yOf(data[i].avgScore)}`).join(" L ");
                        const areaD = `M${firstX},${bottomY} L${linePts} L${lastX},${bottomY} Z`;
                        return <path key={`area-${si}`} d={areaD} fill="url(#itchAreaGradient)"/>;
                    })}

                    {/* かゆみスコア平均の折れ線（記録なし点で線を切る） */}
                    {lineSegments.map((indices, si) => (
                        <polyline
                            key={si}
                            points={indices.map((i) => `${xOf(i)},${yOf(data[i].avgScore)}`).join(" ")}
                            fill="none"
                            stroke={LINE_COLOR}
                            strokeWidth={1.5}
                            strokeLinejoin="round"
                            strokeLinecap="round"
                        />
                    ))}

                    {/* データ点（白塗り＋コーラルボーダーのドット） */}
                    {data.map((entry, i) => entry.avgScore > 0 ? (
                        <circle
                            key={entry.label}
                            cx={xOf(i)}
                            cy={yOf(entry.avgScore)}
                            r={2.2}
                            fill="#FFFFFF"
                            stroke={LINE_COLOR}
                            strokeWidth={1.2}
                        />
                    ) : null)}
                </svg>
            )}
        </div>
    );
}
