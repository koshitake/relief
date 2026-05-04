"use client";

// アプリのメインページです。
// 未ログイン時はログイン誘導画面を表示し、ログイン後に記録画面を表示します。

import { useAppStore } from "@/store/UseAppStore";
import { useAuth } from "@/hooks/UseAuth";
import AppHeader from "@/components/AppHeader";
import CalendarNav from "@/components/CalendarNav";
import RecordTab from "@/components/RecordTab";
import PremiumSection from "@/components/PremiumSection";
import AdBanner from "@/components/AdBanner";

export default function HomePage() {
    const { selectedDay } = useAppStore();
    const { loading } = useAuth();

    // セッション確認中はローディング表示
    if (loading) {
        return (
            <div style={{ textAlign: "center", paddingTop: "40vh", color: "var(--color-text-muted)" }}>
                読み込み中...
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

            {/* 有料機能プレースホルダー */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
                <PremiumSection
                    title="日次アドバイス"
                    description="今日の記録をもとにAIが肌ケアのアドバイスを生成します。"
                />
                <PremiumSection
                    title="相談チャット"
                    description="気になることをAIに相談できます。"
                />
            </div>

            {/* 免責フッター */}
            <p className="disclaimer-footer">
                ※ 医療行為ではありません。症状が続く場合は主治医・皮膚科へご相談ください。
            </p>
        </>
    );
}
