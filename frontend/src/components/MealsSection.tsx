"use client";

// 食事内容入力セクションコンポーネントです。
// 食事内容のテキスト入力、糖質・塩分・タンパク質の手動入力、AI推定ボタンを提供します。

import { useState } from "react";
import { DayRecord } from "@/types/DayRecord";
import { useTranslations } from "@/hooks/UseTranslations";
import { useAppStore } from "@/store/UseAppStore";

interface MealsSectionProps {
    record: DayRecord;
    updateRecord: (patch: Partial<DayRecord>) => void;
}

// AI推定の戻り値の型です。将来 API Route から返す JSON に合わせています。
interface NutritionEstimate {
    carbs_g: number;
    salt_g: number;
    protein_g: number;
    reason: string;
}

// TODO: 有料機能として実装予定。セッションにこの関数をセットすることで AI 推定に切り替わります。
// 入力: 食事内容テキスト  出力: JSON (NutritionEstimate)
async function estimateNutritionStub(_mealsText: string): Promise<NutritionEstimate> {
    // ロジック未実装のためダミー値を返します
    return {
        carbs_g: 0,
        salt_g: 0,
        protein_g: 0,
        reason: "",
    };
}

export default function MealsSection({ record, updateRecord }: MealsSectionProps) {
    const t = useTranslations();
    const plan = useAppStore((s) => s.plan);

    const [isEstimating, setIsEstimating] = useState(false);
    const [estimateReason, setEstimateReason] = useState<string | null>(null);
    const [applied, setApplied] = useState(false);

    const isFull = plan === "full";
    // 食事テキストが空の場合はボタンを無効にします
    const canEstimate = isFull && (record.mealsText ?? "").trim().length > 0;

    async function handleEstimate() {
        if (!canEstimate) return;

        setIsEstimating(true);
        setEstimateReason(null);
        setApplied(false);

        try {
            const result = await estimateNutritionStub(record.mealsText ?? "");
            updateRecord({
                carbsG: result.carbs_g,
                saltG: result.salt_g,
                proteinG: result.protein_g,
            });
            setEstimateReason(result.reason || null);
            setApplied(true);
        } finally {
            setIsEstimating(false);
        }
    }

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

            {/* AI推定ボタンエリア */}
            <div
                style={{
                    borderRadius: "12px",
                    border: "1px solid var(--color-border)",
                    padding: "14px",
                    marginBottom: "16px",
                    background: "var(--color-bg-secondary, #f9f9f9)",
                }}
            >
                {/* ヘッダー行: タイトル + 有料バッジ */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: "10px",
                    }}
                >
                    <span
                        style={{
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            color: "var(--color-text-primary, #1c1c1e)",
                        }}
                    >
                        🤖 AI 栄養推定
                    </span>
                    <span
                        style={{
                            fontSize: "0.65rem",
                            fontWeight: 700,
                            color: "#fff",
                            background: "#FF9500",
                            borderRadius: "4px",
                            padding: "2px 6px",
                            letterSpacing: "0.03em",
                        }}
                    >
                        {t.meals.aiPremiumBadge}
                    </span>
                </div>

                {/* 推定ボタン */}
                <button
                    type="button"
                    onClick={handleEstimate}
                    disabled={!canEstimate || isEstimating}
                    aria-busy={isEstimating}
                    style={{
                        width: "100%",
                        height: "44px",
                        borderRadius: "10px",
                        border: "none",
                        background: canEstimate && !isEstimating ? "#007AFF" : "#C7C7CC",
                        color: "#fff",
                        fontSize: "0.9rem",
                        fontWeight: 600,
                        cursor: canEstimate && !isEstimating ? "pointer" : "not-allowed",
                        transition: "background 0.15s",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                    }}
                >
                    {isEstimating ? (
                        <>
                            {/* ローディングスピナー */}
                            <span
                                role="status"
                                aria-label={t.meals.aiEstimating}
                                style={{
                                    display: "inline-block",
                                    width: "16px",
                                    height: "16px",
                                    border: "2px solid rgba(255,255,255,0.4)",
                                    borderTopColor: "#fff",
                                    borderRadius: "50%",
                                    animation: "spin 0.7s linear infinite",
                                }}
                            />
                            {t.meals.aiEstimating}
                        </>
                    ) : (
                        t.meals.aiEstimateButton
                    )}
                </button>

                {/* 利用不可の説明（Freeプラン or 食事テキスト未入力） */}
                {!isFull && (
                    <p
                        style={{
                            marginTop: "8px",
                            fontSize: "0.75rem",
                            color: "var(--color-text-secondary)",
                            textAlign: "center",
                        }}
                    >
                        {t.meals.aiPlanRequired}
                    </p>
                )}
                {isFull && !canEstimate && (
                    <p
                        style={{
                            marginTop: "8px",
                            fontSize: "0.75rem",
                            color: "var(--color-text-secondary)",
                            textAlign: "center",
                        }}
                    >
                        {t.meals.aiEstimateDisabledHint}
                    </p>
                )}

                {/* 推定完了メッセージ */}
                {applied && !isEstimating && (
                    <p
                        role="status"
                        style={{
                            marginTop: "8px",
                            fontSize: "0.75rem",
                            color: "#34C759",
                            textAlign: "center",
                            fontWeight: 600,
                        }}
                    >
                        ✓ {t.meals.aiEstimateApplied}
                    </p>
                )}

                {/* 推定理由 */}
                {estimateReason && (
                    <div
                        style={{
                            marginTop: "10px",
                            padding: "10px",
                            borderRadius: "8px",
                            background: "rgba(0,122,255,0.06)",
                            border: "1px solid rgba(0,122,255,0.15)",
                        }}
                    >
                        <p
                            style={{
                                fontSize: "0.72rem",
                                fontWeight: 600,
                                color: "#007AFF",
                                marginBottom: "4px",
                            }}
                        >
                            {t.meals.aiEstimateReason}
                        </p>
                        <p
                            style={{
                                fontSize: "0.78rem",
                                color: "var(--color-text-secondary)",
                                lineHeight: 1.5,
                            }}
                        >
                            {estimateReason}
                        </p>
                    </div>
                )}
            </div>

            {/* 糖質・塩分・タンパク質入力（手動入力・AI推定値の上書きも可） */}
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
                        marginBottom: "10px",
                    }}
                >
                    {t.meals.nutrition}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
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

                    {/* タンパク質 */}
                    <div>
                        <label
                            htmlFor="protein-g"
                            style={{
                                display: "block",
                                fontSize: "0.8rem",
                                color: "var(--color-text-secondary)",
                                marginBottom: "6px",
                            }}
                        >
                            {t.meals.protein}
                        </label>
                        <input
                            id="protein-g"
                            type="number"
                            inputMode="decimal"
                            value={record.proteinG ?? ""}
                            min={0}
                            max={999}
                            placeholder={t.meals.proteinPlaceholder}
                            onChange={(e: { target: { value: string } }) => {
                                const raw = e.target.value;
                                updateRecord({
                                    proteinG: raw === "" ? undefined : Math.min(999, Math.max(0, Number(raw))),
                                });
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* スピナーのキーフレーム定義 */}
            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
