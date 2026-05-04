"use client";

// 指定日の記録をAPIから読み書きするカスタムフックです。
// 日付切り替え時は前のデータを維持したまま裏でfetchし、完了後に差し替えます。

import { useState, useEffect, useRef, useCallback } from "react";
import { DayRecord, createEmptyDayRecord } from "@/types/DayRecord";
import { useAuth } from "@/hooks/UseAuth";

// DB書き込みまでの待機時間（ms）
const DEBOUNCE_MS = 800;

export function useDayRecord(day: string) {
    const { user } = useAuth();
    // user?.id はプリミティブ(string | undefined)として取り出す（rerender-dependencies）
    const userId = user?.id;
    const [record, setRecord] = useState<DayRecord>(createEmptyDayRecord());

    // DBから読み込んだ直後のrecord更新でDB書き込みが走らないよう制御するフラグ
    const isDirty = useRef(false);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    // debounce内で最新のrecordを参照するためのref（rerender-use-ref-transient-values）
    const recordRef = useRef<DayRecord>(record);

    // 選択日またはユーザーが変わったらAPIから読み込む
    useEffect(() => {
        isDirty.current = false;

        if (!userId) {
            setRecord(createEmptyDayRecord());
            return;
        }

        let cancelled = false;

        fetch(`/api/records/${day}`)
            .then((r) => r.json())
            .then((data: DayRecord | null) => {
                if (cancelled) return;
                const loaded = data ?? createEmptyDayRecord();
                recordRef.current = loaded;
                setRecord(loaded);
            })
            .catch(() => {
                if (!cancelled) setRecord(createEmptyDayRecord());
            });

        return () => {
            cancelled = true;
        };
    }, [day, userId]);

    // ユーザーの入力によってrecordを更新する
    const updateRecord = useCallback(
        (patch: Partial<DayRecord> | ((prev: DayRecord) => Partial<DayRecord>)) => {
            isDirty.current = true;
            setRecord((prev: DayRecord) => {
                const resolvedPatch = typeof patch === "function" ? patch(prev) : patch;
                const next = { ...prev, ...resolvedPatch };
                recordRef.current = next;
                return next;
            });

            if (debounceTimer.current) clearTimeout(debounceTimer.current);
            debounceTimer.current = setTimeout(() => {
                if (userId && isDirty.current) {
                    fetch(`/api/records/${day}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(recordRef.current),
                    });
                }
            }, DEBOUNCE_MS);
        },
        [day, userId],
    );

    return { record, updateRecord };
}
