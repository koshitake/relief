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
        value: "camera=(), microphone=(), geolocation=()",
    },
    {
        key: "X-XSS-Protection",
        value: "1; mode=block",
    },
    // CSP は src/middleware.ts で nonce ベースに動的生成するため、ここでは定義しない。
    // （静的CSPとmiddlewareのCSPが重複すると 'unsafe-inline' が残存するリスクがあるため）
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
