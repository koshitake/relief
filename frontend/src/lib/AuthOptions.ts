// NextAuth の設定です。サーバー側でのみ使用します。
// Google OAuth でサインインし、メールアドレスを取得・保存しません。

import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import supabaseAdmin from "@/lib/SupabaseAdmin";

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID ?? "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
            authorization: {
                params: {
                    // openid と profile のみ要求する（email スコープを除外してメールアドレスを取得しない）
                    scope: "openid profile",
                },
            },
        }),
    ],
    callbacks: {
        // サインイン時: Google sub を使って users テーブルにユーザーを upsert する
        async signIn({ account, profile }) {
            if (!account || !supabaseAdmin) return false;

            const googleSub = account.providerAccountId;
            const displayName = (profile as { name?: string })?.name ?? "ユーザー";

            const { error } = await supabaseAdmin
                .from("users")
                .upsert(
                    { google_sub: googleSub, display_name: displayName },
                    { onConflict: "google_sub" }
                );

            if (error) {
                console.error("[Relief] ユーザー upsert エラー:", error.message);
                return false;
            }

            return true;
        },

        // JWT 生成時: users テーブルの UUID を token に格納する
        async jwt({ token, account, profile }) {
            if (account && supabaseAdmin) {
                const { data } = await supabaseAdmin
                    .from("users")
                    .select("id")
                    .eq("google_sub", account.providerAccountId)
                    .single();

                if (data) {
                    token.userId = data.id as string;
                }
                // 表示名をトークンに保存（メールアドレスは保存しない）
                token.name = (profile as { name?: string })?.name ?? "ユーザー";
                token.email = undefined;
            }
            return token;
        },

        // セッション生成時: token の情報をセッションに反映する
        async session({ session, token }) {
            session.user.id = (token.userId as string) ?? "";
            session.user.name = (token.name as string) ?? "ユーザー";
            // メールアドレスをセッションに含めない
            delete (session.user as Record<string, unknown>).email;
            return session;
        },
    },
    session: {
        strategy: "jwt",
    },
    // next-auth のデフォルトページを使用（ログインページのカスタマイズは不要）
    pages: {},
};
