"use client";

// メモ（症状・気づき）セクションコンポーネントです。
// 今日の気づきを自由記述するカードです。

import { useAppStore } from "@/store/UseAppStore";

interface NoteSectionProps {
    day: string;
}

export default function NoteSection({ day }: NoteSectionProps) {
    const { getOrCreateRecord, updateRecord } = useAppStore();
    const record = getOrCreateRecord(day);

    return (
        <div className="card">
            <div className="section-label">メモ（症状・気づき）</div>

            <textarea
                value={record.note}
                onChange={(e: { target: { value: string } }) =>
                    updateRecord(day, { note: e.target.value })
                }
                placeholder="その日気づいたことを書いてください"
                rows={3}
                maxLength={1000}
                style={{ resize: "vertical" }}
            />
        </div>
    );
}
