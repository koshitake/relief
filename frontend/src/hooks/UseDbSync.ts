"use client";

// DB との同期を行うカスタムフックです。
// 日付変更時に DB からデータを取得し、記録変更時に DB へ自動保存します。
// ログイン中のユーザーのみ同期を行います。

import { useEffect, useRef } from "react";
import { User } from "@supabase/supabase-js";
import { useAppStore } from "@/store/UseAppStore";
import { fetchDayRecord, upsertDayRecord, deleteOldDayRecords } from "@/lib/DayRecordRepository";
import { MAX_RECORD_DAYS } from "@/constants/AppConstants";

// debounce の待機時間（ms）
const DEBOUNCE_MS = 800;

// MAX_RECORD_DAYS 日前の日付文字列を返す
function getCutoffDateString(): string {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - MAX_RECORD_DAYS);
    return cutoff.toISOString().slice(0, 10);
}

/**
 * DB同期フック。page.tsx から呼び出す。
 * - selectedDay が変わったら DB から fetch してストアに反映する
 * - 記録が変わったら 800ms 後に DB へ upsert する（debounce）
 * - user が null の場合（未ログイン）は何もしない
 */
export function useDbSync(user: User | null) {
    const { selectedDay, records, setRecord, purgeOldRecords } = useAppStore();
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ログイン直後: DB の古いレコードを削除する
    useEffect(() => {
        if (!user) return;

        const cutoff = getCutoffDateString();
        deleteOldDayRecords(cutoff, user.id);
        purgeOldRecords(); // Zustand ストアも同時にパージする
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    // 日付またはログイン状態が変わったら DB からデータを取得してストアに反映する
    useEffect(() => {
        if (!user) return;

        let cancelled = false;

        async function load() {
            const dbRecord = await fetchDayRecord(selectedDay, user!.id);
            // コンポーネントがアンマウントされた後は状態を更新しない
            if (cancelled) return;
            // DB にデータがある場合はストアに反映する
            if (dbRecord) {
                setRecord(selectedDay, dbRecord);
            }
        }

        load();

        return () => {
            cancelled = true;
        };
    }, [selectedDay, user?.id, setRecord]);

    // 記録が変わったら debounce で DB に upsert する
    useEffect(() => {
        if (!user) return;

        const record = records[selectedDay];
        // レコードが未存在（まだ何も入力していない）場合は保存しない
        if (!record) return;

        // 前回の debounce をキャンセルして再セットする
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }

        debounceTimer.current = setTimeout(() => {
            upsertDayRecord(selectedDay, user.id, record);
        }, DEBOUNCE_MS);

        // クリーンアップ: コンポーネントアンマウント時にタイマーをキャンセルする
        return () => {
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }
        };
    }, [selectedDay, records, user?.id]);
}
