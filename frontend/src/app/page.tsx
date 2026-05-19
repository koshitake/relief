"use client";

// アプリのメインページです。
// 未ログイン時はログイン誘導画面を表示し、ログイン後に記録画面を表示します。

import { useAppStore } from "@/store/UseAppStore";
import { useAuth } from "@/hooks/UseAuth";
import { useTranslations } from "@/hooks/UseTranslations";
import AppHeader from "@/components/AppHeader";
import CalendarNav from "@/components/CalendarNav";
import RecordTab from "@/components/RecordTab";
export default function HomePage() {
    const { selectedDay } = useAppStore();
    const { loading } = useAuth();
    const t = useTranslations();

    // セッション確認中はローディング表示
    if (loading) {
        return (
            <div style={{ textAlign: "center", paddingTop: "40vh", color: "var(--color-text-muted)" }}>
                {t.common.loading}
            </div>
        );
    }

    return (
        <>
            {/* ヘッダー */}
            <AppHeader />

            {/* カレンダーナビゲーション */}
            <CalendarNav />

            {/* ダッシュボード（今日のまとめ / 入力 タブ切り替え） */}
            <RecordTab day={selectedDay} />

            {/* 免責フッター */}
            <p className="disclaimer-footer">
                {t.common.disclaimer}
            </p>
        </>
    );
}
