"use client";

// 食事内容入力セクションコンポーネントです。
// 食事内容のテキスト入力、糖質・塩分の入力（手動 or AI自動入力）、AI推定ボタンを提供します。
// AI推定は有料機能のため現時点では未実装です。

import { DayRecord } from "@/types/DayRecord";
import { useTranslations } from "@/hooks/UseTranslations";

interface MealsSectionProps {
    record: DayRecord;
    updateRecord: (patch: Partial<DayRecord>) => void;
}

export default function MealsSection({ record, updateRecord }: MealsSectionProps) {
    const t = useTranslations();

    return (
        <div>
            {/* 食事内容テキスト入力 */}
            <label
                htmlFor="meals-text"
                style={{
                    display: "block",
                    fontSize: "0.8rem",
                    color: "var(--color-text-secondary)",
                    marginBottom: "6px",
                }}
            >
                {t.meals.title}
            </label>
            <textarea
                id="meals-text"
                value={record.mealsText}
                onChange={(e: { target: { value: string } }) =>
                    updateRecord({ mealsText: e.target.value })
                }
                placeholder={t.meals.placeholder}
                rows={4}
                maxLength={2000}
                style={{ resize: "vertical", marginBottom: "16px" }}
            />

            {/* 糖質・塩分入力（手動入力、またはAI推定で自動入力される） */}
            <div
                style={{
                    borderTop: "1px solid var(--color-border)",
                    paddingTop: "12px",
                    marginBottom: "16px",
                }}
            >
                <div
                    style={{
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        color: "var(--color-text-secondary)",
                        marginBottom: "4px",
                    }}
                >
                    {t.meals.nutrition}
                </div>
                <div
                    style={{
                        fontSize: "0.75rem",
                        color: "var(--color-text-muted)",
                        marginBottom: "10px",
                    }}
                >
                    {t.meals.nutritionHint}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    {/* 糖質 */}
                    <div>
                        <label
                            htmlFor="carbs-g"
                            style={{
                                display: "block",
                                fontSize: "0.8rem",
                                color: "var(--color-text-secondary)",
                                marginBottom: "6px",
                            }}
                        >
                            {t.meals.carbs}
                        </label>
                        <input
                            id="carbs-g"
                            type="number"
                            inputMode="decimal"
                            value={record.carbsG ?? ""}
                            min={0}
                            max={999}
                            placeholder={t.meals.carbsPlaceholder}
                            onChange={(e: { target: { value: string } }) => {
                                const raw = e.target.value;
                                updateRecord({
                                    carbsG: raw === "" ? undefined : Math.min(999, Math.max(0, Number(raw))),
                                });
                            }}
                        />
                    </div>

                    {/* 塩分 */}
                    <div>
                        <label
                            htmlFor="salt-g"
                            style={{
                                display: "block",
                                fontSize: "0.8rem",
                                color: "var(--color-text-secondary)",
                                marginBottom: "6px",
                            }}
                        >
                            {t.meals.salt}
                        </label>
                        <input
                            id="salt-g"
                            type="number"
                            inputMode="decimal"
                            value={record.saltG ?? ""}
                            min={0}
                            max={99}
                            step={0.1}
                            placeholder={t.meals.saltPlaceholder}
                            onChange={(e: { target: { value: string } }) => {
                                const raw = e.target.value;
                                updateRecord({
                                    saltG: raw === "" ? undefined : Math.min(99, Math.max(0, Number(raw))),
                                });
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* AI推定ボタン（有料機能・準備中） */}
            <button
                className="btn-premium-disabled"
                disabled
                aria-label={t.meals.aiButtonAriaLabel}
            >
                <span>🔒</span>
                <span>{t.meals.aiButtonText}</span>
            </button>
        </div>
    );
}
