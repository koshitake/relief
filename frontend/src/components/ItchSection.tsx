"use client";

// かゆみセクションコンポーネントです。
// 部位チップの複数選択と5段階アイコンによるスコア入力を提供します。

import { DayRecord } from "@/types/DayRecord";
import { ITCH_SCORE_ICONS } from "@/constants/AppConstants";
import { useTranslations } from "@/hooks/UseTranslations";

interface ItchSectionProps {
    record: DayRecord;
    updateRecord: (patch: Partial<DayRecord>) => void;
}

// スコア値（1〜5）と表示順の定義
const SCORE_VALUES = [1, 2, 3, 4, 5] as const;

export default function ItchSection({ record, updateRecord }: ItchSectionProps) {
    const t = useTranslations();

    // 部位の選択/解除を切り替える
    function toggleArea(area: string) {
        const current = record.itchArea;
        const next = current.includes(area)
            ? current.filter((a) => a !== area)
            : [...current, area];
        updateRecord({ itchArea: next });
    }

    // アイコンをタップしたとき：選択済みならスコアを0（未入力）に戻す
    function selectScore(score: number) {
        updateRecord({ itchScore: record.itchScore === score ? 0 : score });
    }

    return (
        <div>
            {/* かゆみの部位チップ選択 */}
            <div style={{ marginBottom: "14px" }}>
                <div style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", marginBottom: "8px" }}>
                    {t.itch.areaLabel}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {t.itch.areas.map((area) => {
                        const selected = record.itchArea.includes(area);
                        return (
                            <button
                                key={area}
                                onClick={() => toggleArea(area)}
                                style={{
                                    padding: "6px 12px",
                                    borderRadius: "var(--radius-pill)",
                                    border: selected
                                        ? "1.5px solid var(--color-accent)"
                                        : "1px solid var(--color-border)",
                                    background: selected
                                        ? "rgba(217, 107, 95, 0.1)"
                                        : "var(--color-input-bg)",
                                    color: selected
                                        ? "var(--color-accent)"
                                        : "var(--color-text-secondary)",
                                    fontSize: "0.78rem",
                                    fontWeight: selected ? 600 : 400,
                                    cursor: "pointer",
                                    fontFamily: "inherit",
                                    transition: "all 0.15s ease",
                                    minHeight: "36px",
                                }}
                            >
                                {area}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* かゆみスコア 5段階アイコン選択 */}
            <div>
                <div style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", marginBottom: "10px" }}>
                    {t.itch.score}
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                    {SCORE_VALUES.map((score) => {
                        const selected = record.itchScore === score;
                        const label = t.itch.scoreLabels[score - 1];
                        return (
                            <button
                                key={score}
                                onClick={() => selectScore(score)}
                                style={{
                                    flex: 1,
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: "4px",
                                    padding: "10px 2px",
                                    borderRadius: "var(--radius-input)",
                                    border: selected
                                        ? "1.5px solid var(--color-accent)"
                                        : "1px solid var(--color-border)",
                                    background: selected
                                        ? "rgba(217, 107, 95, 0.1)"
                                        : "var(--color-input-bg)",
                                    cursor: "pointer",
                                    fontFamily: "inherit",
                                    transition: "all 0.15s ease",
                                    minHeight: "60px",
                                }}
                            >
                                <span style={{ fontSize: "1.5rem", lineHeight: 1 }}>
                                    {ITCH_SCORE_ICONS[score]}
                                </span>
                                <span style={{
                                    fontSize: "0.6rem",
                                    color: selected ? "var(--color-accent)" : "var(--color-text-muted)",
                                    fontWeight: selected ? 600 : 400,
                                    textAlign: "center",
                                    lineHeight: 1.3,
                                    whiteSpace: "pre-wrap",
                                }}>
                                    {label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
