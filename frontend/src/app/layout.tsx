import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
    title: "Relief - アトピーセルフケア",
    description: "食事・かゆみ・水分を記録して、肌の傾向を把握しよう",
    manifest: "/manifest.json",
    // PWA: iOSのホーム画面追加に対応
    appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "Relief",
    },
    icons: {
        icon: "/icons/icon-192.svg",
        apple: "/icons/icon-192.svg",
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="ja">
            <head>
                {/* Space Grotesk（数値・英語）と Noto Sans JP（日本語）を読み込む */}
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
                <link
                    href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=Noto+Sans+JP:wght@400;600;700&display=swap"
                    rel="stylesheet"
                />
                {/* PWA: スマホのステータスバーカラーを設定 */}
                <meta name="theme-color" content="#F2F2F7" />
                {/* PWA: ノッチ・ホームバー領域まで表示を拡張 */}
                <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
            </head>
            <body>
                {/* NextAuth のセッション状態をアプリ全体で使えるようにする */}
                <Providers>
                    {/* コンテンツ幅をモバイルサイズ(480px)に制限する */}
                    <main
                        style={{
                            maxWidth: "480px",
                            margin: "0 auto",
                            /* PWA: ホームバー分の余白を safe-area-inset-bottom で確保 */
                            padding: "0 1rem calc(4rem + env(safe-area-inset-bottom))",
                            minHeight: "100vh",
                            position: "relative",
                            zIndex: 1,
                        }}
                    >
                        {children}
                    </main>
                </Providers>
            </body>
        </html>
    );
}
