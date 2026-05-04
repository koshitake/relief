"use client";

// ユーザー設定（目標水分量など）をAPIから読み書きするカスタムフックです。
// ログイン時にAPIから設定を読み込んでストアに同期し、変更時はAPIに保存します。

import { useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/UseAuth";
import { useAppStore } from "@/store/UseAppStore";

export function useUserSettings() {
    const { user } = useAuth();
    const { setWaterTargetMl } = useAppStore();
    const userId = user?.id;

    // ログイン時にAPIから設定を読み込んでストアに同期する
    useEffect(() => {
        if (!userId) return;

        fetch("/api/settings")
            .then((r) => r.json())
            .then((data: { waterTargetMl?: number } | null) => {
                if (data?.waterTargetMl) setWaterTargetMl(data.waterTargetMl);
            })
            .catch(() => {});
    }, [userId, setWaterTargetMl]);

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

    return { saveWaterTargetMl };
}
