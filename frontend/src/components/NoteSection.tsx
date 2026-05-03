"use client";

// メモ（症状・気づき）セクションコンポーネントです。
// 今日の気づきを自由記述するカードです。

import { DayRecord } from "@/types/DayRecord";

interface NoteSectionProps {
    record: DayRecord;
    updateRecord: (patch: Partial<DayRecord>) => void;
}

export default function NoteSection({ record, updateRecord }: NoteSectionProps) {
    return (
        <div>
            <textarea
                value={record.note}
                onChange={(e: { target: { value: string } }) =>
                    updateRecord({ note: e.target.value })
                }
                placeholder="その日気づいたことを書いてください"
                rows={3}
                maxLength={1000}
                style={{ resize: "vertical" }}
            />
        </div>
    );
}
