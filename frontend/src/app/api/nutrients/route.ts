// 食事内容から栄養素を推定する AI API へのサーバーサイドプロキシです。
// クライアントから直接 AI API を呼ぶと RELIEF_API_URL や apiToken が露出するため、
// このルートを経由させることでサーバーサイドのみに機密情報を閉じ込めます。

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

/** AI API への認証用 JWT を生成する（HS256 形式）。
 *  jose が未インストールのため Web Crypto API（Node.js 18+）で実装する。 */
async function createApiToken(userId: string, plan: number, secret: string): Promise<string> {
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const payload = Buffer.from(JSON.stringify({
        sub: userId,
        plan,
        exp: Math.floor(Date.now() / 1000) + 900, // 15分
    })).toString("base64url");

    const signing = `${header}.${payload}`;
    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
    );
    const signatureBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signing));
    const signature = Buffer.from(signatureBuf).toString("base64url");

    return `${signing}.${signature}`;
}

const FULL_PLAN = 10;
// 全角・半角を問わず文字数で制限する（API仕様: 100文字以内）
const MAX_MEAL_LENGTH = 100;

export async function GET(request: NextRequest) {
    // NextAuth JWT を検証してユーザー情報を取得する
    // App Router では secret を明示的に渡す必要がある
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
        console.error("[Relief] NEXTAUTH_SECRET が未設定です");
        return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }
    const token = await getToken({ req: request, secret });
    if (!token || !token.userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fullプランのみ利用可能
    // token.plan は再サインイン後に設定される。未設定（既存セッション）の場合は
    // DB から直接取得してフォールバックする
    let planNumber = Number(token.plan ?? -1);
    if (planNumber < 0) {
        // 古いセッション（plan未設定）の場合のみ DB に問い合わせる
        const { fetchUserSettings } = await import("@/lib/UserSettingsRepository");
        const settings = await fetchUserSettings(token.userId as string);
        planNumber = settings?.plan === "full" ? FULL_PLAN : 0;
    }
    if (planNumber < FULL_PLAN) {
        return NextResponse.json({ error: "Full plan required" }, { status: 403 });
    }

    // meal パラメータのバリデーション
    const meal = request.nextUrl.searchParams.get("meal") ?? "";
    if (!meal.trim()) {
        return NextResponse.json({ error: "meal は必須です" }, { status: 422 });
    }
    // [...meal] でサロゲートペアを含む Unicode 文字を正確にカウントする
    if ([...meal].length > MAX_MEAL_LENGTH) {
        return NextResponse.json({ error: `meal は${MAX_MEAL_LENGTH}文字以内で入力してください` }, { status: 422 });
    }

    // AI API 用 JWT を生成する（secret は上で取得済み）
    const apiToken = await createApiToken(token.userId as string, planNumber, secret);

    // AI API への問い合わせ
    // RELIEF_API_URL が未設定の場合はローカル開発用のデフォルト値を使う
    const apiUrl = (process.env.RELIEF_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

    let response: Response;
    try {
        response = await fetch(
            `${apiUrl}/api/nutrients?meal=${encodeURIComponent(meal)}`,
            {
                headers: { Authorization: `Bearer ${apiToken}` },
                // AI 推定は最大 20 秒かかるため余裕を持たせる
                signal: AbortSignal.timeout(25000),
            },
        );
    } catch (err) {
        console.error("[Relief] AI API への接続に失敗しました:", err);
        return NextResponse.json({ error: "AI APIへの接続に失敗しました" }, { status: 503 });
    }

    if (!response.ok) {
        const body = await response.text().catch(() => "");
        console.error(`[Relief] AI API エラー status=${response.status} body=${body}`);
        return NextResponse.json(
            { error: "栄養素の推定に失敗しました" },
            { status: response.status },
        );
    }

    const data = await response.json();
    return NextResponse.json(data);
}
