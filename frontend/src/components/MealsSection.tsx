"use client";

// 食事内容入力セクションコンポーネントです。
// 食事内容のテキスト入力、糖質・塩分の入力（手動 or AI自動入力）、AI推定ボタンを提供します。
// AI推定は有料機能のため現時点では未実装です。

import { useAppStore } from "@/store/UseAppStore";

interface MealsSectionProps {
    day: string;
}

export default function MealsSection({ day }: MealsSectionProps) {
    const { getOrCreateRecord, updateRecord } = useAppStore();
    const record = getOrCreateRecord(day);

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
                食事内容
            </label>
            <textarea
                id="meals-text"
                value={record.mealsText}
                onChange={(e: { target: { value: string } }) =>
                    updateRecord(day, { mealsText: e.target.value })
                }
                placeholder={"例: 朝 玄米・味噌汁\n昼 そば  夜 鶏むね・野菜炒め"}
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
                    糖質・塩分
                </div>
                {/* AI推定時に自動入力される旨を説明するサブテキスト */}
                <div
                    style={{
                        fontSize: "0.75rem",
                        color: "var(--color-text-muted)",
                        marginBottom: "10px",
                    }}
                >
                    手動で入力できます。AIで推定すると自動で入力されます。
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
                            糖質（g）
                        </label>
                        <input
                            id="carbs-g"
                            type="number"
                            inputMode="decimal"
                            value={record.carbsG ?? ""}
                            min={0}
                            max={999}
                            placeholder="例: 68"
                            onChange={(e: { target: { value: string } }) => {
                                const raw = e.target.value;
                                updateRecord(day, {
                                    carbsG: raw === "" ? undefined : Math.max(0, Number(raw)),
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
                            塩分（g）
                        </label>
                        <input
                            id="salt-g"
                            type="number"
                            inputMode="decimal"
                            value={record.saltG ?? ""}
                            min={0}
                            max={99}
                            step={0.1}
                            placeholder="例: 6.2"
                            onChange={(e: { target: { value: string } }) => {
                                const raw = e.target.value;
                                updateRecord(day, {
                                    saltG: raw === "" ? undefined : Math.max(0, Number(raw)),
                                });
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* AI推定ボタン（有料機能 - 現時点では未実装） - カード最下部に配置 */}
            <button
                className="btn-premium-disabled"
                disabled
                aria-label="AI糖質・塩分推定（有料機能）"
            >
                <span>🔒</span>
                <span>AIで糖質・塩分を推定する（有料機能）</span>
            </button>
        </div>
    );
}
