// CSP は next.config.ts で管理しています。
// nonce ベースの CSP 実装は Next.js の全スクリプトへの nonce 自動付与が
// 確認できるまで保留中のため、このミドルウェアは何も処理せずスルーします。
import { NextResponse, type NextRequest } from "next/server";

export function middleware(_request: NextRequest): NextResponse {
    return NextResponse.next();
}
