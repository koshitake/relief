// アプリ全体のUI状態を管理する Zustand ストアです。
// 日次記録データの永続化は Supabase（DB）が担うため、このストアは保持しません。

import { create } from "zustand";
import {
    DEFAULT_WATER_TARGET_ML, MIN_WATER_TARGET_ML, MAX_WATER_TARGET_ML,
    DEFAULT_CARBS_TARGET_G, MIN_CARBS_TARGET_G, MAX_CARBS_TARGET_G,
    DEFAULT_SALT_TARGET_G, MIN_SALT_TARGET_G, MAX_SALT_TARGET_G,
} from "@/constants/AppConstants";

interface AppState {
    /** 現在表示中の日付（YYYY-MM-DD形式） */
    selectedDay: string;
    /** 1日の目標水分量（ml）。ユーザーが設定可能 */
    waterTargetMl: number;
    /** 1日の糖質目標（g）。ユーザーが設定可能 */
    carbsTargetG: number;
    /** 1日の塩分目標（g）。ユーザーが設定可能 */
    saltTargetG: number;
    /** 現在アクティブなタブ */
    activeTab: "summary" | "input";
    /** ログイン中ユーザーの表示名。設定変更後に即時反映するためストアで管理する */
    displayName: string;
}

interface AppActions {
    /** 日付を選択する */
    setSelectedDay: (day: string) => void;
    /** 1日の目標水分量を更新する */
    setWaterTargetMl: (ml: number) => void;
    /** 1日の糖質目標を更新する */
    setCarbsTargetG: (g: number) => void;
    /** 1日の塩分目標を更新する */
    setSaltTargetG: (g: number) => void;
    /** タブを切り替える */
    setActiveTab: (tab: "summary" | "input") => void;
    /** 表示名を更新する */
    setDisplayName: (name: string) => void;
}

// 今日の日付を YYYY-MM-DD 形式で返す
function getTodayString(): string {
    return new Date().toISOString().slice(0, 10);
}

export const useAppStore = create<AppState & AppActions>()((set) => ({
    selectedDay: getTodayString(),
    waterTargetMl: DEFAULT_WATER_TARGET_ML,
    carbsTargetG: DEFAULT_CARBS_TARGET_G,
    saltTargetG: DEFAULT_SALT_TARGET_G,
    activeTab: "summary",
    displayName: "",

    setSelectedDay: (day: string) => set({ selectedDay: day }),

    setWaterTargetMl: (ml: number) => {
        const clamped = Math.min(MAX_WATER_TARGET_ML, Math.max(MIN_WATER_TARGET_ML, ml));
        set({ waterTargetMl: clamped });
    },

    setCarbsTargetG: (g: number) => {
        const clamped = Math.min(MAX_CARBS_TARGET_G, Math.max(MIN_CARBS_TARGET_G, g));
        set({ carbsTargetG: clamped });
    },

    setSaltTargetG: (g: number) => {
        const clamped = Math.min(MAX_SALT_TARGET_G, Math.max(MIN_SALT_TARGET_G, g));
        set({ saltTargetG: clamped });
    },

    setActiveTab: (tab: "summary" | "input") => set({ activeTab: tab }),

    setDisplayName: (name: string) => set({ displayName: name }),
}));
