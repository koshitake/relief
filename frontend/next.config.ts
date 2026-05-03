import type { NextConfig } from "next";

// セキュリティヘッダーの定義
// XSS・クリックジャッキング・MIMEタイプスニッフィング等への対策
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
    {
        // HTTPS を強制する（本番環境での中間者攻撃対策）
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
    },
    {
        // 読み込み元を制限し、XSS・データ注入攻撃を軽減する
        // Next.js のインラインスクリプト対応のため unsafe-inline を許可しているが、
        // 将来的には nonce ベースへ移行することでさらに強化できる
        key: "Content-Security-Policy",
        value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: https:",
            "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://accounts.google.com",
            "frame-src https://accounts.google.com",
            "frame-ancestors 'none'",
        ].join("; "),
    },
];

const nextConfig: NextConfig = {
    async headers() {
        return [
            {
                // 全ルートにセキュリティヘッダーを適用する
                source: "/(.*)",
                headers: securityHeaders,
            },
        ];
    },
};

export default nextConfig;
