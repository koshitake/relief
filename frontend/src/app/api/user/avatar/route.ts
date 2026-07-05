// アバター画像の取得 (GET)・アップロード (POST)・削除 (DELETE) を行う API Route です。
// セッション認証必須。ファイルサイズ上限 5MB、JPEG/PNG/WebP のみ許可します。
// 画像はBase64 Data URLに変換してDBに直接保存します。
// JWTのCookieサイズ制限（4KB）を超えないよう、アバターデータはJWTに含めずAPIで取得します。

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/AuthOptions";
import { validateAvatarFile, toDataUrl } from "@/lib/AvatarStorage";
import supabaseAdmin from "@/lib/SupabaseAdmin";

/** アバター画像を取得する */
export async function GET(): Promise<NextResponse> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!supabaseAdmin) {
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }

    const { data } = await supabaseAdmin
        .from("users")
        .select("avatar_url")
        .eq("id", session.user.id)
        .maybeSingle();

    return NextResponse.json({ avatarUrl: data?.avatar_url ?? null });
}

/** アバター画像をアップロードする */
export async function POST(req: NextRequest): Promise<NextResponse> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!supabaseAdmin) {
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // バリデーション（サイズ・MIME type・マジックバイト）
    let mime: ReturnType<typeof validateAvatarFile>;
    try {
        mime = validateAvatarFile(buffer, file.type);
    } catch (e) {
        const msg = e instanceof Error ? e.message : "Invalid file";
        return NextResponse.json({ error: msg }, { status: 400 });
    }

    // Base64 Data URL に変換してDBに保存する
    const dataUrl = toDataUrl(buffer, mime);

    const { error: dbError } = await supabaseAdmin
        .from("users")
        .update({ avatar_url: dataUrl })
        .eq("id", session.user.id);

    if (dbError) {
        console.error("[Relief] アバター保存エラー:", dbError.message);
        return NextResponse.json({ error: "DB update failed" }, { status: 500 });
    }

    return NextResponse.json({ avatarUrl: dataUrl });
}

/** アバター画像を削除する */
export async function DELETE(): Promise<NextResponse> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!supabaseAdmin) {
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }

    // DBのavatar_urlをクリアする
    const { error: dbError } = await supabaseAdmin
        .from("users")
        .update({ avatar_url: null })
        .eq("id", session.user.id);

    if (dbError) {
        console.error("[Relief] アバター削除エラー:", dbError.message);
        return NextResponse.json({ error: "DB update failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
}
