"use client";

// メモ（症状・気づき）セクションコンポーネントです。
// 今日の気づきを自由記述するカードです。

import { DayRecord } from "@/types/DayRecord";
import { useTranslations } from "@/hooks/UseTranslations";

interface NoteSectionProps {
    record: DayRecord;
    updateRecord: (patch: Partial<DayRecord>) => void;
}

export default function NoteSection({ record, updateRecord }: NoteSectionProps) {
    const t = useTranslations();

    return (
        <div>
            <textarea
                value={record.note}
                onChange={(e: { target: { value: string } }) =>
                    updateRecord({ note: e.target.value })
                }
                placeholder={t.note.placeholder}
                rows={3}
                maxLength={1000}
                style={{ resize: "vertical" }}
            />
        </div>
    );
}
