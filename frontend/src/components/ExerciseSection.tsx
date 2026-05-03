"use client";

// 運動セクションコンポーネントです。
// 運動内容を自由記述で入力するカードです。

import { DayRecord } from "@/types/DayRecord";

interface ExerciseSectionProps {
    record: DayRecord;
    updateRecord: (patch: Partial<DayRecord>) => void;
}

export default function ExerciseSection({ record, updateRecord }: ExerciseSectionProps) {
    return (
        <div>
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
                    updateRecord({ exerciseText: e.target.value })
                }
                placeholder="例: ウォーキング30分、ストレッチ10分"
                maxLength={200}
                style={{ background: "var(--color-input-bg)" }}
            />
        </div>
    );
}
