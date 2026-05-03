"use client";

// 指定日の記録をDBから読み書きするカスタムフックです。
// 日付切り替え時は前のデータを維持したまま裏でfetchし、完了後に差し替えます。

import { useState, useEffect, useRef, useCallback } from "react";
import { DayRecord, createEmptyDayRecord } from "@/types/DayRecord";
import { fetchDayRecord, upsertDayRecord } from "@/lib/DayRecordRepository";
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

    // 選択日またはユーザーが変わったらDBから読み込む
    // 前のデータはそのまま表示し続け、fetch完了後に差し替えることでちらつきを防ぐ
    useEffect(() => {
        isDirty.current = false;

        if (!userId) {
            setRecord(createEmptyDayRecord());
            return;
        }

        let cancelled = false;

        fetchDayRecord(day, userId).then((dbRecord) => {
            if (cancelled) return;
            const loaded = dbRecord ?? createEmptyDayRecord();
            recordRef.current = loaded;
            setRecord(loaded);
        });

        return () => {
            cancelled = true;
        };
    }, [day, userId]);

    // ユーザーの入力によってrecordを更新する。
    // debounceをuseEffect外で管理することで、recordを依存配列に持つuseEffectを不要にする（rerender-use-ref-transient-values）
    // 関数パッチ(prev => patch)をサポートすることで、呼び出し元のstale closureを防ぐ
    const updateRecord = useCallback(
        (patch: Partial<DayRecord> | ((prev: DayRecord) => Partial<DayRecord>)) => {
            isDirty.current = true;
            setRecord((prev) => {
                const resolvedPatch = typeof patch === "function" ? patch(prev) : patch;
                const next = { ...prev, ...resolvedPatch };
                // setRecord内でrefを同期更新してdebounce側が最新値を参照できるようにする
                recordRef.current = next;
                return next;
            });

            if (debounceTimer.current) clearTimeout(debounceTimer.current);
            debounceTimer.current = setTimeout(() => {
                if (userId && isDirty.current) {
                    upsertDayRecord(day, userId, recordRef.current);
                }
            }, DEBOUNCE_MS);
        },
        [day, userId],
    );

    return { record, updateRecord };
}
