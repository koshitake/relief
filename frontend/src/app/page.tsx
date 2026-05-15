"use client";

// アプリのメインページです。
// 未ログイン時はログイン誘導画面を表示し、ログイン後に記録画面を表示します。

import { useAppStore } from "@/store/UseAppStore";
import { useAuth } from "@/hooks/UseAuth";
import { useTranslations } from "@/hooks/UseTranslations";
import AppHeader from "@/components/AppHeader";
import CalendarNav from "@/components/CalendarNav";
import RecordTab from "@/components/RecordTab";
import PremiumSection from "@/components/PremiumSection";
import AdBanner from "@/components/AdBanner";

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

            {/* 広告バナー（AdSense 審査通過後に表示される） */}
            <AdBanner slot="top" />

            {/* ダッシュボード（今日のまとめ / 入力 タブ切り替え） */}
            <RecordTab day={selectedDay} />

            {/* 有料機能プレースホルダー（日次アドバイスのみ） */}
            <div style={{ marginTop: "12px" }}>
                <PremiumSection
                    title={t.premium.dailyAdviceTitle}
                    description={t.premium.dailyAdviceDescription}
                />
            </div>

            {/* 免責フッター */}
            <p className="disclaimer-footer">
                {t.common.disclaimer}
            </p>
        </>
    );
}
