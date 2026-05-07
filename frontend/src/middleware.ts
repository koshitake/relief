// XSS対策: リクエストごとにランダムなnonceを生成し、CSPに組み込む。
// 'unsafe-inline' を使わずに Next.js のハイドレーションスクリプトを許可するための仕組み。
// Next.js は x-nonce ヘッダーを参照し、内部スクリプトタグに自動でnonce属性を付与する。

import { NextResponse, type NextRequest } from "next/server";

// APP_ENV の判定ロジックは next.config.ts と同一にする
function getIsLocal(): boolean {
    const appEnv = process.env.APP_ENV
        ?? (process.env.NODE_ENV === "development" ? "local" : "production");
    return appEnv === "local";
}

// 暗号的にランダムな16バイトをBase64エンコードしてnonceを生成する
function generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return btoa(Array.from(array, (b) => String.fromCharCode(b)).join(""));
}

export function middleware(request: NextRequest): NextResponse {
    const nonce = generateNonce();
    const isLocal = getIsLocal();

    // ローカル: react-refresh が eval() を使うため unsafe-eval を許可する
    // staging / production: 'self' で同一オリジンスクリプトを許可し、
    //   'unsafe-inline' でインラインスクリプトを許可する（変更前と同等の設定）。
    //   nonce はヘッダーに含めるが、'strict-dynamic' は使用しない。
    //   'strict-dynamic' は 'self' を無効化するため、Next.js の chunk スクリプトが
    //   ブロックされる問題が発生する。nonce 専用 CSP への移行は Next.js 側の
    //   自動 nonce 付与が確認できてから別途対応する。
    const scriptSrc = isLocal
        ? `'self' 'nonce-${nonce}' 'unsafe-eval' 'unsafe-inline'`
        : `'self' 'nonce-${nonce}' 'unsafe-inline'`;

    const csp = [
        "default-src 'self'",
        `script-src ${scriptSrc}`,
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https:",
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://accounts.google.com",
        "frame-src https://accounts.google.com",
        "frame-ancestors 'none'",
    ].join("; ");

    // nonceをリクエストヘッダーに付与して、Next.jsとServer Componentsが参照できるようにする
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-nonce", nonce);

    const response = NextResponse.next({
        request: { headers: requestHeaders },
    });

    // レスポンスにnonceベースのCSPを設定する（next.config.tsの静的CSPを上書きする）
    response.headers.set("Content-Security-Policy", csp);

    return response;
}

export const config = {
    // 静的ファイル・Next.js内部リソース・アイコン・マニフェストを除外する
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|icons|manifest.json).*)",
    ],
};
