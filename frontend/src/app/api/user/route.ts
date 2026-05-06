// ユーザープロフィール（ニックネーム）を取得・更新する API Route です。
// NextAuth セッションでユーザーを確認してから DB 操作を行います。

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/AuthOptions";
import supabaseAdmin from "@/lib/SupabaseAdmin";

const MAX_NICKNAME_LENGTH = 50;

const profileSchema = z.object({
    displayName: z.string().min(1).max(MAX_NICKNAME_LENGTH),
});

/** 現在のニックネームを取得する */
export async function GET(): Promise<NextResponse> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!supabaseAdmin) {
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }

    const { data, error } = await supabaseAdmin
        .from("users")
        .select("display_name")
        .eq("id", session.user.id)
        .single();

    if (error || !data) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ displayName: data.display_name });
}

/** ニックネームを更新する */
export async function PUT(req: NextRequest): Promise<NextResponse> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = profileSchema.safeParse(await req.json());
    if (!result.success) {
        return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    if (!supabaseAdmin) {
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }

    const { error } = await supabaseAdmin
        .from("users")
        .update({ display_name: result.data.displayName })
        .eq("id", session.user.id);

    if (error) {
        console.error("[Relief] ニックネーム更新エラー:", error.message);
        return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
}
