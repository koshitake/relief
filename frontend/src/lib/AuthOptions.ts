// NextAuth の設定です。サーバー側でのみ使用します。
// Google OAuth でサインインし、メールアドレスを取得・保存しません。

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

export const authOptions: NextAuthOptions = {
    secret: requireSecret(),
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
        // JWT 生成時（初回サインイン時のみ account が存在する）:
        // 既存ユーザーはDBのニックネームを使い、新規ユーザーのみ Google 名をデフォルトとして INSERT する
        async jwt({ token, account, profile }: { token: JWT; account: Account | null; profile?: Profile }) {
            if (account && supabaseAdmin) {
                const googleSub = account.providerAccountId;
                const googleName = (profile as { name?: string })?.name ?? "ユーザー";

                // 既存ユーザーかどうか確認する
                const { data: existing } = await supabaseAdmin
                    .from("users")
                    .select("id, display_name")
                    .eq("google_sub", googleSub)
                    .maybeSingle();

                if (existing) {
                    // 既存ユーザー: DBのニックネームを使用（ユーザーが変更したニックネームを保持する）
                    token.userId = existing.id as string;
                    token.name = existing.display_name as string;
                } else {
                    // 新規ユーザー: Google 名をデフォルトとして INSERT する
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
                    token.name = googleName;
                }

                token.email = undefined;
            }
            return token;
        },

        // セッション生成時: token の情報をセッションに反映する
        async session({ session, token }: { session: Session; token: JWT }) {
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
