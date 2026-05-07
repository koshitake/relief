"use client";

// 指定日の記録をAPIから読み書きするカスタムフックです。
// 初回ロード時は設定と記録を Promise.all で並列取得してレイアウトシフトを防ぎます。
// 日付切り替え時は記録のみを再取得します。

import { useState, useEffect, useRef, useCallback } from "react";
import { DayRecord, createEmptyDayRecord } from "@/types/DayRecord";
import { useAuth } from "@/hooks/UseAuth";
import { useAppStore } from "@/store/UseAppStore";

// DB書き込みまでの待機時間（ms）
const DEBOUNCE_MS = 800;

export function useDayRecord(day: string) {
    const { user } = useAuth();
    // user?.id はプリミティブ(string | undefined)として取り出す（rerender-dependencies）
    const userId = user?.id;
    const [record, setRecord] = useState<DayRecord>(createEmptyDayRecord());

    // セレクターで必要な値だけ購読する（rerender-dependencies）
    const setWaterTargetMl = useAppStore((s) => s.setWaterTargetMl);

    // DBから読み込んだ直後のrecord更新でDB書き込みが走らないよう制御するフラグ
    const isDirty = useRef(false);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    // debounce内で最新のrecordを参照するためのref（rerender-use-ref-transient-values）
    const recordRef = useRef<DayRecord>(record);
    // settings の初回取得済みフラグ（日付切り替え時に再取得しないようにする）
    const settingsFetched = useRef(false);

    // 選択日またはユーザーが変わったらAPIから読み込む
    useEffect(() => {
        isDirty.current = false;

        if (!userId) {
            setRecord(createEmptyDayRecord());
            settingsFetched.current = false;
            return;
        }

        let cancelled = false;

        if (!settingsFetched.current) {
            // 初回ロード時: 記録と設定を並列取得してレイアウトシフトを防ぐ（async-parallel）
            Promise.all([
                fetch(`/api/records/${day}`).then((r) => r.json()),
                fetch("/api/settings").then((r) => r.json()),
            ])
                .then(([recordData, settingsData]: [DayRecord | null, { waterTargetMl?: number } | null]) => {
                    if (cancelled) return;
                    settingsFetched.current = true;
                    if (settingsData?.waterTargetMl) setWaterTargetMl(settingsData.waterTargetMl);
                    const loaded = recordData ?? createEmptyDayRecord();
                    recordRef.current = loaded;
                    setRecord(loaded);
                })
                .catch(() => {
                    if (!cancelled) setRecord(createEmptyDayRecord());
                });
        } else {
            // 日付切り替え時: 記録のみ再取得する
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
        }

        return () => {
            cancelled = true;
        };
    }, [day, userId, setWaterTargetMl]);

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
