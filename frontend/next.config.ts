import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

// APP_ENV で環境を切り替える
// local      : ローカル開発（unsafe-eval 許可、HSTS 無効、Service Worker 無効）
// staging    : Vercel 上での動作確認（本番同等の設定）
// production : 本番（最も厳格な設定）
// APP_ENV 未設定の場合は NODE_ENV で判定する（development -> local、それ以外 -> production）
const appEnv = process.env.APP_ENV
    ?? (process.env.NODE_ENV === "development" ? "local" : "production");

const isLocal = appEnv === "local";

// セキュリティヘッダーの定義
const securityHeaders = [
    {
        key: "X-Frame-Options",
        value: "DENY",
    },
    {
        key: "X-Content-Type-Options",
        value: "nosniff",
    },
    {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
    },
    {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(self)",
    },
    {
        key: "X-XSS-Protection",
        value: "1; mode=block",
    },
    {
        // ローカル: react-refresh が eval() を使うため unsafe-eval を許可する
        // staging / production: 厳格な CSP を適用する
        key: "Content-Security-Policy",
        value: [
            "default-src 'self'",
            isLocal
                ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
                : "script-src 'self' 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: https:",
            "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://accounts.google.com",
            "frame-src https://accounts.google.com",
            "frame-ancestors 'none'",
        ].join("; "),
    },
];

// ローカルは HTTP のため HSTS を適用しない。staging / production は HTTPS なので有効にする
if (isLocal === false) {
    securityHeaders.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
    });
}

const nextConfig: NextConfig = {
    async headers() {
        return [
            {
                source: "/(.*)",
                headers: securityHeaders,
            },
        ];
    },
    // Next.js 16 からデフォルトで Turbopack が有効になるため明示的に設定する
    turbopack: {},
};

export default withPWA({
    dest: "public",
    cacheOnFrontEndNav: true,
    aggressiveFrontEndNavCaching: true,
    // ローカルでは Service Worker を無効にして HMR と干渉しないようにする
    disable: isLocal,
})(nextConfig);
