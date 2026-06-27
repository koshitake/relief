"use client";

// 指定日の記録をAPIから読み書きするカスタムフックです。
// ユーザー設定（プラン・言語・目標値）の読み込みは UseAuth が担うため、
// このフックは日次記録の取得・保存のみを担当します。

import { useState, useEffect, useRef, useCallback } from "react";
import { DayRecord, createEmptyDayRecord } from "@/types/DayRecord";
import { useAuth } from "@/hooks/UseAuth";

export function useDayRecord(day: string) {
    const { user } = useAuth();
    // user?.id はプリミティブ(string | undefined)として取り出す（rerender-dependencies）
    const userId = user?.id;
    const [record, setRecord] = useState<DayRecord>(createEmptyDayRecord());
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    // 日付切り替え時のフラッシュ保存用（最新値を同期的に参照するためのref）
    const isDirtyRef = useRef(false);
    // saveRecord・日付切り替え時に最新のrecordを参照するためのref
    const recordRef = useRef<DayRecord>(record);

    // 選択日またはユーザーが変わったらAPIから記録を読み込む
    useEffect(() => {
        isDirtyRef.current = false;
        setIsDirty(false);

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
            // 日付切り替え・ページ離脱時に未保存の変更を自動保存する（保存忘れ防止）
            if (isDirtyRef.current && userId) {
                fetch(`/api/records/${day}`, {
                    method:  "PUT",
                    headers: { "Content-Type": "application/json" },
                    body:    JSON.stringify(recordRef.current),
                });
            }
        };
    }, [day, userId]);

    // ユーザーの入力によってrecordをメモリ上で更新する（DBへの保存は saveRecord で行う）
    const updateRecord = useCallback(
        (patch: Partial<DayRecord> | ((prev: DayRecord) => Partial<DayRecord>)) => {
            isDirtyRef.current = true;
            setIsDirty(true);
            setIsSaved(false);
            setRecord((prev: DayRecord) => {
                const resolvedPatch = typeof patch === "function" ? patch(prev) : patch;
                const next = { ...prev, ...resolvedPatch };
                recordRef.current = next;
                return next;
            });
        },
        [],
    );

    // 保存ボタン押下時にDBへ書き込む
    const saveRecord = useCallback(async () => {
        if (!userId) return;
        setIsSaving(true);
        try {
            await fetch(`/api/records/${day}`, {
                method:  "PUT",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify(recordRef.current),
            });
            isDirtyRef.current = false;
            setIsDirty(false);
            setIsSaved(true);
            // 2秒後に保存済み表示を初期状態に戻す
            setTimeout(() => setIsSaved(false), 2000);
        } finally {
            setIsSaving(false);
        }
    }, [day, userId]);

    return { record, updateRecord, saveRecord, isSaving, isSaved, isDirty };
}
