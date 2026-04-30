"use client";

// 食事内容入力セクションコンポーネントです。
// 食事内容のテキスト入力と、糖質・塩分の手動入力を提供します。
// AI推定は有料機能のため現時点では未実装です。

import { useAppStore } from "@/store/UseAppStore";

interface MealsSectionProps {
    day: string;
}

export default function MealsSection({ day }: MealsSectionProps) {
    const { getOrCreateRecord, updateRecord } = useAppStore();
    const record = getOrCreateRecord(day);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {/* 食事内容入力 */}
            <div className="card">
                <div className="section-label">食事</div>

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
                    style={{ resize: "vertical", marginBottom: "12px" }}
                />

                {/* AI推定ボタン（有料機能 - 現時点では未実装） */}
                <button
                    className="btn-premium-disabled"
                    disabled
                    aria-label="AI糖質・塩分推定（有料機能）"
                >
                    <span>🔒</span>
                    <span>AIで糖質・塩分を推定する（有料機能）</span>
                </button>
            </div>

            {/* 栄養手動入力（AIが未実装のため、手動で入力できる） */}
            <div className="card">
                <div className="section-label">栄養（手動入力）</div>

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
        </div>
    );
}
