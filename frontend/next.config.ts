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
