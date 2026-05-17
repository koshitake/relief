"use client";

// かゆみ傾向グラフコンポーネント。
// 部位ごとに折れ線グラフで出現日数の推移を表示します（月次/週次切り替え）。

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "@/hooks/UseTranslations";
import { useAppStore } from "@/store/UseAppStore";
import type { ItchStatEntry } from "@/app/api/itch-stats/route";

// 表示する最大部位数（多すぎると視認しにくいため上位に絞る）
const MAX_AREAS = 7;

// 部位ごとの折れ線の色パレット
const LINE_COLORS = [
    "#FF3B30", // 赤
    "#007AFF", // 青
    "#34C759", // 緑
    "#FF9500", // オレンジ
    "#5856D6", // 紫
    "#FF2D55", // ピンク
    "#30B0C7", // 水色
];

// グラフの描画定数（SVG単位）。月次水分量グラフと同じ高さ系定数を使う
const GRAPH_HEIGHT = 100;
const PADDING_TOP = 16;    // 上部余白
const PADDING_BOTTOM = 18; // X軸ラベル用
const PADDING_LEFT = 32;   // Y軸ラベル用
const PADDING_RIGHT = 32; // 左と同じにすることでデータ描画エリアをセンタリング
// viewBox の固定幅。左右パディングが同じになるよう PADDING_LEFT*2 分広げた値
const VIEW_WIDTH = 214;

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

// データ全体から頻度上位の部位を返す
function getTopAreas(data: ItchStatEntry[], maxCount: number): string[] {
    const totals: Record<string, number> = {};
    for (const entry of data) {
        for (const [area, count] of Object.entries(entry.areaCounts)) {
            totals[area] = (totals[area] ?? 0) + count;
        }
    }
    return Object.entries(totals)
        .sort(([, a], [, b]) => b - a)
        .slice(0, maxCount)
        .map(([area]) => area);
}

export default function ItchTrendChart() {
    const t = useTranslations();
    const locale = useAppStore((s) => s.locale);

    const [granularity, setGranularity] = useState<"monthly" | "weekly">("monthly");
    const [data, setData] = useState<ItchStatEntry[]>([]);
    const [loading, setLoading] = useState(false);

    // 月次は12ヶ月分、週次は約1ヶ月分（5週）を取得する
    const count = granularity === "monthly" ? 12 : 5;

    useEffect(() => {
        setLoading(true);
        fetch(`/api/itch-stats?granularity=${granularity}&count=${count}`)
            .then((r) => r.json())
            .then((json: unknown) => {
                setData(Array.isArray(json) ? (json as ItchStatEntry[]) : []);
            })
            .catch(() => setData([]))
            .finally(() => setLoading(false));
    }, [granularity, count]);

    // 表示する部位（出現頻度上位）
    const topAreas = useMemo(() => getTopAreas(data, MAX_AREAS), [data]);

    // Y軸最大値はかゆみスコアの最大値である10に固定する
    const Y_MAX = 10;

    // X座標を計算する。データ点をビュー幅いっぱいに比例配置する
    const plotWidth = VIEW_WIDTH - PADDING_LEFT - PADDING_RIGHT;
    const xOf = (i: number) => {
        if (data.length <= 1) return PADDING_LEFT + plotWidth / 2;
        return PADDING_LEFT + (i / (data.length - 1)) * plotWidth;
    };

    // Y座標を計算する（カウント値から）
    const yOf = (value: number) =>
        PADDING_TOP + GRAPH_HEIGHT * (1 - value / Y_MAX);

    const svgHeight = GRAPH_HEIGHT + PADDING_TOP + PADDING_BOTTOM;

    const hasAreaData = topAreas.length > 0;

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
                <div>
                    <svg
                        viewBox={`0 0 ${VIEW_WIDTH} ${svgHeight}`}
                        width="100%"
                        preserveAspectRatio="none"
                        style={{ display: "block", overflow: "visible" }}
                    >
                        {/* Y軸ガイドライン（0〜10を1刻み） */}
                        {Array.from({ length: 11 }, (_, i) => i).map((tick) => {
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
                                    <text
                                        x={PADDING_LEFT - 2}
                                        y={y + 2}
                                        textAnchor="end"
                                        fontSize={5}
                                        fontWeight="bold"
                                        fill="#000000"
                                    >
                                        {tick}
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
                                    fontWeight="bold"
                                    fill="#000000"
                                >
                                    {formatLabel(entry.label, granularity, locale)}
                                </text>
                            ) : null;
                        })}

                        {/* 部位ごとの折れ線 */}
                        {hasAreaData ? topAreas.map((area, areaIdx) => {
                            const color = LINE_COLORS[areaIdx % LINE_COLORS.length];

                            // 折れ線の座標文字列を組み立てる
                            const points = data
                                .map((entry, i) => `${xOf(i)},${yOf(entry.areaCounts[area] ?? 0)}`)
                                .join(" ");

                            return (
                                <g key={area}>
                                    {/* 折れ線 */}
                                    <polyline
                                        points={points}
                                        fill="none"
                                        stroke={color}
                                        strokeWidth={0.9}
                                        strokeDasharray="4 2"
                                        strokeLinejoin="round"
                                        strokeLinecap="round"
                                    />
                                    {/* 各データ点のドット */}
                                    {data.map((entry, i) => {
                                        const count = entry.areaCounts[area] ?? 0;
                                        return count > 0 ? (
                                            <circle
                                                key={entry.label}
                                                cx={xOf(i)}
                                                cy={yOf(count)}
                                                r={1.5}
                                                fill={color}
                                            />
                                        ) : null;
                                    })}
                                </g>
                            );
                        }) : (
                            /* 部位データなし：かゆみスコア平均の折れ線を表示 */
                            <polyline
                                points={data.map((entry, i) => `${xOf(i)},${yOf(entry.avgScore)}`).join(" ")}
                                fill="none"
                                stroke={LINE_COLORS[0]}
                                strokeWidth={0.9}
                                strokeDasharray="4 2"
                                strokeLinejoin="round"
                            />
                        )}
                    </svg>
                </div>
            )}

            {/* 凡例（部位名と色） */}
            {!loading && hasAreaData && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 10px", marginTop: "6px" }}>
                    {topAreas.map((area, i) => (
                        <div key={area} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <div style={{
                                width: "10px",
                                height: "2px",
                                background: LINE_COLORS[i % LINE_COLORS.length],
                                borderRadius: "1px",
                                flexShrink: 0,
                            }} />
                            <span style={{ fontSize: "0.65rem", color: "var(--color-text-muted)" }}>
                                {area}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
