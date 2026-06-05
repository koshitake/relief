"use client";

// ユーザー設定（目標水分量・糖質目標・塩分目標など）をAPIに保存するカスタムフックです。
// 初回ロード時の読み込みは UseDayRecord が Promise.all で並列処理しているため、
// このフックは保存処理のみ担当します。

import { useCallback } from "react";
import { useAuth } from "@/hooks/UseAuth";
import { useAppStore } from "@/store/UseAppStore";

export function useUserSettings() {
    const { user } = useAuth();
    // セレクターで必要な値だけ購読する（rerender-dependencies）
    const setWaterTargetMl = useAppStore((s) => s.setWaterTargetMl);
    const setCarbsTargetG = useAppStore((s) => s.setCarbsTargetG);
    const setSaltTargetG = useAppStore((s) => s.setSaltTargetG);
    const setProteinTargetG = useAppStore((s) => s.setProteinTargetG);
    const userId = user?.id;

    // 目標水分量をAPIに保存しつつストアも更新する
    const saveWaterTargetMl = useCallback((ml: number) => {
        setWaterTargetMl(ml);
        if (userId) {
            fetch("/api/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ waterTargetMl: ml }),
            });
        }
    }, [userId, setWaterTargetMl]);

    // 糖質・塩分・タンパク質目標をAPIに保存しつつストアも更新する
    const saveNutritionTargets = useCallback((carbsTargetG: number, saltTargetG: number, proteinTargetG: number) => {
        setCarbsTargetG(carbsTargetG);
        setSaltTargetG(saltTargetG);
        setProteinTargetG(proteinTargetG);
        if (userId) {
            fetch("/api/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ carbsTargetG, saltTargetG, proteinTargetG }),
            });
        }
    }, [userId, setCarbsTargetG, setSaltTargetG, setProteinTargetG]);

    return { saveWaterTargetMl, saveNutritionTargets };
}
