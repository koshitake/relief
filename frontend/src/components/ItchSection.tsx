"use client";

// かゆみセクションコンポーネントです。
// 部位入力とスライダーを提供します。

import { DayRecord } from "@/types/DayRecord";
import { MAX_ITCH_SCORE } from "@/constants/AppConstants";
import { useTranslations } from "@/hooks/UseTranslations";

interface ItchSectionProps {
    record: DayRecord;
    updateRecord: (patch: Partial<DayRecord>) => void;
}

export default function ItchSection({ record, updateRecord }: ItchSectionProps) {
    const t = useTranslations();
    // スライダーの塗りつぶし率（0〜100%）を計算する
    const fillPercent = (record.itchScore / MAX_ITCH_SCORE) * 100;

    return (
        <div>
            {/* かゆみの部位入力 */}
            <div style={{ marginBottom: "14px" }}>
                <label
                    htmlFor="itch-area"
                    style={{
                        display: "block",
                        fontSize: "0.8rem",
                        color: "var(--color-text-secondary)",
                        marginBottom: "6px",
                    }}
                >
                    {t.itch.area}
                </label>
                <input
                    id="itch-area"
                    type="text"
                    value={record.itchArea}
                    onChange={(e: { target: { value: string } }) =>
                        updateRecord({ itchArea: e.target.value })
                    }
                    placeholder={t.itch.areaPlaceholder}
                    maxLength={100}
                />
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
