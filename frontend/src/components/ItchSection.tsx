"use client";

// かゆみセクションコンポーネントです。
// 部位チップの複数選択とスコアスライダーを提供します。

import { DayRecord } from "@/types/DayRecord";
import { MAX_ITCH_SCORE } from "@/constants/AppConstants";
import { useTranslations } from "@/hooks/UseTranslations";

interface ItchSectionProps {
    record: DayRecord;
    updateRecord: (patch: Partial<DayRecord>) => void;
}

export default function ItchSection({ record, updateRecord }: ItchSectionProps) {
    const t = useTranslations();
    const fillPercent = (record.itchScore / MAX_ITCH_SCORE) * 100;

    // 部位の選択/解除を切り替える
    function toggleArea(area: string) {
        const current = record.itchArea;
        const next = current.includes(area)
            ? current.filter((a) => a !== area)
            : [...current, area];
        updateRecord({ itchArea: next });
    }

    return (
        <div>
            {/* かゆみの部位チップ選択 */}
            <div style={{ marginBottom: "14px" }}>
                <div
                    style={{
                        fontSize: "0.8rem",
                        color: "var(--color-text-secondary)",
                        marginBottom: "8px",
                    }}
                >
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
                                        ? "rgba(0, 122, 255, 0.1)"
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

            {/* かゆみスコアスライダー */}
            <div>
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        marginBottom: "10px",
                    }}
                >
                    <label
                        htmlFor="itch-score"
                        style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}
                    >
                        {t.itch.score}
                    </label>
                    <span>
                        <span
                            style={{
                                fontFamily: "'Space Grotesk', sans-serif",
                                fontSize: "1.6rem",
                                fontWeight: 700,
                                color: "var(--color-text-primary)",
                            }}
                        >
                            {record.itchScore}
                        </span>
                        <span
                            style={{
                                fontSize: "0.8rem",
                                color: "var(--color-text-muted)",
                                marginLeft: "3px",
                            }}
                        >
                            / {MAX_ITCH_SCORE}
                        </span>
                    </span>
                </div>

                <input
                    id="itch-score"
                    type="range"
                    min={0}
                    max={MAX_ITCH_SCORE}
                    value={record.itchScore}
                    onChange={(e: { target: { value: string } }) =>
                        updateRecord({ itchScore: Number(e.target.value) })
                    }
                    style={{
                        background: `linear-gradient(90deg, #007AFF ${fillPercent}%, #E5E5EA ${fillPercent}%)`,
                    }}
                />

                {/* 最小・最大ラベル */}
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.7rem",
                        color: "var(--color-text-muted)",
                        marginTop: "4px",
                    }}
                >
                    <span>{t.itch.scoreMin}</span>
                    <span>{t.itch.scoreMax}</span>
                </div>
            </div>
        </div>
    );
}
