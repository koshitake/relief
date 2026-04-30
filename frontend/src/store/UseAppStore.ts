// アプリ全体の状態管理を行う Zustand ストアです。
// データの永続化は Supabase（DB）が担うため、このストアはメモリ内のみで保持します。

import { create } from "zustand";
import { DayRecord, createEmptyDayRecord } from "@/types/DayRecord";
import { MAX_RECORD_DAYS, DEFAULT_WATER_TARGET_ML, MIN_WATER_TARGET_ML, MAX_WATER_TARGET_ML } from "@/constants/AppConstants";

// ストアの状態の型定義
interface AppState {
    /** 日付文字列（YYYY-MM-DD）→ DayRecord の辞書 */
    records: Record<string, DayRecord>;
    /** 現在表示中の日付（YYYY-MM-DD形式） */
    selectedDay: string;
    /** 1日の目標水分量（ml）。ユーザーが設定可能 */
    waterTargetMl: number;
}

// ストアのアクションの型定義
interface AppActions {
    /** 日付を選択する */
    setSelectedDay: (day: string) => void;
    /** 指定日の記録を取得する。存在しない場合は空レコードを返す（副作用なし） */
    getOrCreateRecord: (day: string) => DayRecord;
    /** 指定日の記録を更新する */
    updateRecord: (day: string, patch: Partial<DayRecord>) => void;
    /** 指定日の記録をまるごと置き換える（DBからのロード時に使用） */
    setRecord: (day: string, record: DayRecord) => void;
    /** 無料プランの制限: MAX_RECORD_DAYS 日より古い記録を削除する */
    purgeOldRecords: () => void;
    /** 1日の目標水分量を更新する */
    setWaterTargetMl: (ml: number) => void;
}

// 今日の日付を YYYY-MM-DD 形式で返す
function getTodayString(): string {
    return new Date().toISOString().slice(0, 10);
}

// MAX_RECORD_DAYS 日前の日付文字列を返す（この日より古い記録を削除する）
function getCutoffDateString(): string {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - MAX_RECORD_DAYS);
    return cutoff.toISOString().slice(0, 10);
}

export const useAppStore = create<AppState & AppActions>()((set, get) => ({
    // 初期状態
    records: {},
    selectedDay: getTodayString(),
    waterTargetMl: DEFAULT_WATER_TARGET_ML,

    setSelectedDay: (day) => set({ selectedDay: day }),

    getOrCreateRecord: (day) => {
        // レンダー中に呼ばれるため set() を呼ばず純粋な読み取りのみ行う。
        // 存在しない場合は空レコードを返すだけで、ストアへの書き込みは行わない。
        // 書き込みは updateRecord が初めて呼ばれた時に行われる。
        return get().records[day] ?? createEmptyDayRecord();
    },

    updateRecord: (day, patch) => {
        set((state) => ({
            records: {
                ...state.records,
                // 既存レコードがない場合は空レコードをベースにする（フィールド未定義を防ぐ）
                [day]: { ...createEmptyDayRecord(), ...state.records[day], ...patch },
            },
        }));
    },

    setRecord: (day, record) => {
        set((state) => ({
            records: { ...state.records, [day]: record },
        }));
    },

    purgeOldRecords: () => {
        const cutoff = getCutoffDateString();
        set((state) => {
            // cutoff 日より古いキーをフィルタして削除する
            const filtered = Object.fromEntries(
                Object.entries(state.records).filter(([day]) => day >= cutoff)
            );
            return { records: filtered };
        });
    },

    setWaterTargetMl: (ml) => {
        // 入力値を許容範囲内にクランプしてから保存する
        const clamped = Math.min(MAX_WATER_TARGET_ML, Math.max(MIN_WATER_TARGET_ML, ml));
        set({ waterTargetMl: clamped });
    },
}));
