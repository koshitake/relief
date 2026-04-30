"use client";

// 運動セクションコンポーネントです。
// 運動内容を自由記述で入力するカードです。

import { useAppStore } from "@/store/UseAppStore";

interface ExerciseSectionProps {
    day: string;
}

export default function ExerciseSection({ day }: ExerciseSectionProps) {
    const { getOrCreateRecord, updateRecord } = useAppStore();
    const record = getOrCreateRecord(day);

    return (
        <div className="card">
            <div className="section-label" style={{ color: "var(--color-text-secondary)" }}>
                運動
            </div>

            <label
                htmlFor="exercise-text"
                style={{
                    display: "block",
                    fontSize: "0.8rem",
                    color: "var(--color-text-secondary)",
                    marginBottom: "6px",
                }}
            >
                運動内容（任意）
            </label>
            <input
                id="exercise-text"
                type="text"
                value={record.exerciseText}
                onChange={(e: { target: { value: string } }) =>
                    updateRecord(day, { exerciseText: e.target.value })
                }
                placeholder="例: ウォーキング30分、ストレッチ10分"
                maxLength={200}
                style={{ background: "var(--color-input-bg)" }}
            />
        </div>
    );
}
