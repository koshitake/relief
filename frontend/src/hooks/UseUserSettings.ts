"use client";

// ユーザー設定（目標水分量など）を DB から読み書きするカスタムフックです。
// ログイン時に DB から設定を読み込んでストアに同期し、
// 変更時は DB に保存します。

import { useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/UseAuth";
import { useAppStore } from "@/store/UseAppStore";
import { fetchUserSettings, upsertUserSettings } from "@/lib/UserSettingsRepository";

export function useUserSettings() {
    const { user } = useAuth();
    const { setWaterTargetMl } = useAppStore();
    const userId = user?.id;

    // ログイン時に DB から設定を読み込んでストアに同期する
    useEffect(() => {
        if (!userId) return;

        fetchUserSettings(userId).then((settings) => {
            if (settings) setWaterTargetMl(settings.waterTargetMl);
        });
    }, [userId, setWaterTargetMl]);

    // 目標水分量を DB に保存しつつストアも更新する
    const saveWaterTargetMl = useCallback((ml: number) => {
        setWaterTargetMl(ml);
        if (userId) upsertUserSettings(userId, { waterTargetMl: ml });
    }, [userId, setWaterTargetMl]);

    return { saveWaterTargetMl };
}
