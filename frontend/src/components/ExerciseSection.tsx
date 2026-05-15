"use client";

// 運動セクションコンポーネントです。
// 運動内容を自由記述で入力するカードです。

import { DayRecord } from "@/types/DayRecord";
import { useTranslations } from "@/hooks/UseTranslations";

interface ExerciseSectionProps {
    record: DayRecord;
    updateRecord: (patch: Partial<DayRecord>) => void;
}

export default function ExerciseSection({ record, updateRecord }: ExerciseSectionProps) {
    const t = useTranslations();

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
                {t.exercise.label}
            </label>
            <input
                id="exercise-text"
                type="text"
                value={record.exerciseText}
                onChange={(e: { target: { value: string } }) =>
                    updateRecord({ exerciseText: e.target.value })
                }
                placeholder={t.exercise.placeholder}
                maxLength={200}
                style={{ background: "var(--color-input-bg)" }}
            />
        </div>
    );
}
