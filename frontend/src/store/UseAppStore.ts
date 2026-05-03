// アプリ全体のUI状態を管理する Zustand ストアです。
// 日次記録データの永続化は Supabase（DB）が担うため、このストアは保持しません。

import { create } from "zustand";
import { DEFAULT_WATER_TARGET_ML, MIN_WATER_TARGET_ML, MAX_WATER_TARGET_ML } from "@/constants/AppConstants";

interface AppState {
    /** 現在表示中の日付（YYYY-MM-DD形式） */
    selectedDay: string;
    /** 1日の目標水分量（ml）。ユーザーが設定可能 */
    waterTargetMl: number;
    /** 現在アクティブなタブ */
    activeTab: "summary" | "input";
}

interface AppActions {
    /** 日付を選択する */
    setSelectedDay: (day: string) => void;
    /** 1日の目標水分量を更新する */
    setWaterTargetMl: (ml: number) => void;
    /** タブを切り替える */
    setActiveTab: (tab: "summary" | "input") => void;
}

// 今日の日付を YYYY-MM-DD 形式で返す
function getTodayString(): string {
    return new Date().toISOString().slice(0, 10);
}

export const useAppStore = create<AppState & AppActions>()((set) => ({
    selectedDay: getTodayString(),
    waterTargetMl: DEFAULT_WATER_TARGET_ML,
    activeTab: "summary",

    setSelectedDay: (day: string) => set({ selectedDay: day }),

    setWaterTargetMl: (ml: number) => {
        // 入力値を許容範囲内にクランプしてから保存する
        const clamped = Math.min(MAX_WATER_TARGET_ML, Math.max(MIN_WATER_TARGET_ML, ml));
        set({ waterTargetMl: clamped });
    },

    setActiveTab: (tab: "summary" | "input") => set({ activeTab: tab }),
}));
