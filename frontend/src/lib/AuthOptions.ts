// NextAuth の設定です。サーバー側でのみ使用します。
// Google OAuth でサインインし、メールアドレスを取得・保存しません。
// Drive スコープを含むため、サインイン時に Google Drive へのアクセス同意を求めます。

import { NextAuthOptions, Session, Account, Profile } from "next-auth";
import { JWT } from "next-auth/jwt";
import GoogleProvider from "next-auth/providers/google";
import supabaseAdmin from "@/lib/SupabaseAdmin";

// NEXTAUTH_SECRET が未設定のままデプロイされると JWT 偽造が可能になるため、起動時に検証する
function requireSecret(): string {
    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) throw new Error("[Relief] NEXTAUTH_SECRET が設定されていません。環境変数を確認してください。");
    return secret;
}

// access_token の期限切れ時に refresh_token を使って更新する
async function refreshGoogleToken(token: JWT): Promise<JWT> {
    try {
        const res = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id:     process.env.GOOGLE_CLIENT_ID!,
                client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                grant_type:    "refresh_token",
                refresh_token: token.refreshToken as string,
            }),
        });
        const refreshed = await res.json();
        if (!res.ok) throw refreshed;
        return {
            ...token,
            accessToken:        refreshed.access_token,
            accessTokenExpires: Date.now() + refreshed.expires_in * 1000,
        };
    } catch (error) {
        console.error("[Relief] Google トークン更新エラー:", error);
        // 更新失敗: refreshToken をクリアしてフロント側で再サインインを促す
        return { ...token, refreshToken: undefined };
    }
}

export const authOptions: NextAuthOptions = {
    secret: requireSecret(),
    providers: [
        GoogleProvider({
            clientId:     process.env.GOOGLE_CLIENT_ID ?? "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
            authorization: {
                params: {
                    // drive.file: このアプリが作成したファイルのみアクセス可能な最小権限スコープ
                    scope:       "openid profile https://www.googleapis.com/auth/drive.file",
                    access_type: "offline",
                    // refresh_token を確実に取得するため毎回同意画面を表示する
                    prompt:      "consent",
                },
            },
        }),
    ],
    callbacks: {
        // JWT 生成・更新時の処理
        async jwt({ token, account, profile, trigger }: { token: JWT; account: Account | null; profile?: Profile; trigger?: string }) {
            // セッション更新（ニックネーム変更後）: DB から最新の表示名を取得する
            if (trigger === "update" && supabaseAdmin && token.userId) {
                const { data } = await supabaseAdmin
                    .from("users")
                    .select("display_name")
                    .eq("id", token.userId as string)
                    .maybeSingle();
                if (data) token.name = data.display_name as string;
                return token;
            }

            if (account) {
                // 初回サインイン: Google トークンを JWT に保存する（Drive API 用）
                token.accessToken        = account.access_token;
                token.refreshToken       = account.refresh_token;
                token.accessTokenExpires = (account.expires_at ?? 0) * 1000;

                if (supabaseAdmin) {
                    const googleSub  = account.providerAccountId;
                    const googleName = (profile as { name?: string })?.name ?? "ユーザー";

                    const { data: existing } = await supabaseAdmin
                        .from("users")
                        .select("id, display_name")
                        .eq("google_sub", googleSub)
                        .maybeSingle();

                    if (existing) {
                        token.userId = existing.id as string;
                        token.name   = existing.display_name as string;
                    } else {
                        const { data: newUser, error } = await supabaseAdmin
                            .from("users")
                            .insert({ google_sub: googleSub, display_name: googleName })
                            .select("id")
                            .single();

                        if (error || !newUser) {
                            console.error("[Relief] ユーザー insert エラー:", error?.message);
                            throw new Error("Failed to create user");
                        }

                        token.userId = newUser.id as string;
                        token.name   = googleName;
                    }
                }

                token.email = undefined;
                return token;
            }

            // access_token が期限切れかつ refresh_token が存在する場合は更新する
            if (token.refreshToken && Date.now() > (token.accessTokenExpires as number ?? 0)) {
                return refreshGoogleToken(token);
            }

            return token;
        },

        // セッション生成時: token の情報をセッションに反映する
        async session({ session, token }: { session: Session; token: JWT }) {
            session.user.id      = (token.userId as string) ?? "";
            session.user.name    = (token.name as string) ?? "ユーザー";
            session.accessToken  = token.accessToken as string | undefined;
            // refresh_token が存在する = drive.file スコープに同意済み
            session.hasDriveScope = !!token.refreshToken;
            // メールアドレスをセッションに含めない
            delete (session.user as Record<string, unknown>).email;
            return session;
        },
    },
    session: {
        strategy: "jwt",
    },
    pages: {},
};
