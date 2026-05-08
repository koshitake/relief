"use client";

// 設定画面です。ニックネーム変更と有料プランへのアップグレードができます。

import { useState, useEffect } from "react";
import { useAppStore } from "@/store/UseAppStore";
import { useAuth } from "@/hooks/UseAuth";

// 有料プランの定義
const PLANS = [
    {
        key: "standard",
        name: "Standard",
        price: "準備中",
        features: ["広告非表示", "1年間記録", "データエクスポート"],
    },
    {
        key: "pro",
        name: "Pro",
        price: "準備中",
        features: ["Standard の全機能", "AI機能 月60回", "食事推定・日次アドバイス"],
    },
] as const;

export default function SettingsPage() {
    const { user, loading } = useAuth();
    const displayName = useAppStore((s) => s.displayName);
    const setDisplayName = useAppStore((s) => s.setDisplayName);

    const [nicknameInput, setNicknameInput] = useState(displayName);
    const [saving, setSaving] = useState(false);
    const [saveResult, setSaveResult] = useState<"success" | "error" | null>(null);

    // ストアのニックネームが更新されたら入力欄を同期する
    useEffect(() => {
        setNicknameInput(displayName);
    }, [displayName]);

    async function handleNicknameSave() {
        const trimmed = nicknameInput.trim();
        if (!trimmed || trimmed === displayName) return;

        setSaving(true);
        setSaveResult(null);

        const res = await fetch("/api/user", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ displayName: trimmed }),
        });

        setSaving(false);
        if (res.ok) {
            setDisplayName(trimmed);
            setSaveResult("success");
        } else {
            setSaveResult("error");
        }
    }

    if (loading) {
        return (
            <div style={{ textAlign: "center", paddingTop: "40vh", color: "var(--color-text-muted)" }}>
                読み込み中...
            </div>
        );
    }

    if (!user) {
        return (
            <div style={{ textAlign: "center", paddingTop: "40vh", color: "var(--color-text-muted)" }}>
                ログインが必要です
            </div>
        );
    }

    return (
        <>
            {/* ページタイトル */}
            <div style={{ paddingTop: "24px", paddingBottom: "16px" }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
                    設定
                </div>
            </div>

            {/* プロフィール */}
            <div className="card" style={{ marginBottom: "12px" }}>
                <div className="section-label">プロフィール</div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                        type="text"
                        value={nicknameInput}
                        onChange={(e) => {
                            setNicknameInput(e.target.value);
                            setSaveResult(null);
                        }}
                        maxLength={50}
                        placeholder="ニックネーム"
                        style={{ flex: 1, fontSize: "0.9rem" }}
                    />
                    <button
                        onClick={handleNicknameSave}
                        disabled={saving || !nicknameInput.trim() || nicknameInput.trim() === displayName}
                        style={{
                            border: "none",
                            background: "var(--color-accent)",
                            color: "#fff",
                            borderRadius: "var(--radius-pill)",
                            padding: "10px 16px",
                            fontSize: "0.82rem",
                            fontWeight: 600,
                            cursor: "pointer",
                            fontFamily: "inherit",
                            whiteSpace: "nowrap",
                            opacity: (saving || !nicknameInput.trim() || nicknameInput.trim() === displayName) ? 0.4 : 1,
                        }}
                    >
                        {saving ? "保存中…" : "変更"}
                    </button>
                </div>
                {saveResult === "success" ? (
                    <p style={{ fontSize: "0.75rem", color: "#34C759", marginTop: "8px", margin: "8px 0 0" }}>
                        ニックネームを変更しました
                    </p>
                ) : null}
                {saveResult === "error" ? (
                    <p style={{ fontSize: "0.75rem", color: "#FF3B30", marginTop: "8px", margin: "8px 0 0" }}>
                        変更に失敗しました。もう一度お試しください
                    </p>
                ) : null}
            </div>

            {/* プラン */}
            <div style={{ marginBottom: "4px" }}>
                <div style={{
                    fontSize: "0.72rem",
                    color: "var(--color-text-muted)",
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                    marginBottom: "8px",
                }}>
                    プラン
                </div>

                {/* 現在のプラン */}
                <div className="card" style={{ marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--color-text-primary)" }}>
                        無料プラン
                    </span>
                    <span style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>
                        14日間記録
                    </span>
                </div>

                {/* 有料プランカード */}
                {PLANS.map((plan) => (
                    <div key={plan.key} className="card" style={{ marginBottom: "8px" }}>
                        <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "8px",
                        }}>
                            <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
                                {plan.name}
                            </span>
                            <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                                {plan.price}
                            </span>
                        </div>
                        <ul style={{ margin: "0 0 12px", paddingLeft: "16px" }}>
                            {plan.features.map((f) => (
                                <li key={f} style={{
                                    fontSize: "0.78rem",
                                    color: "var(--color-text-secondary)",
                                    lineHeight: 1.9,
                                }}>
                                    {f}
                                </li>
                            ))}
                        </ul>
                        <button
                            onClick={() => alert("現在準備中です。しばらくお待ちください。")}
                            style={{
                                width: "100%",
                                border: "none",
                                background: "var(--color-accent)",
                                color: "#fff",
                                borderRadius: "var(--radius-pill)",
                                padding: "12px",
                                fontSize: "0.85rem",
                                fontWeight: 600,
                                cursor: "pointer",
                                fontFamily: "inherit",
                            }}
                        >
                            {plan.name} にアップグレード
                        </button>
                    </div>
                ))}
            </div>

            {/* データ管理 */}
            <div style={{ marginBottom: "12px" }}>
                <div style={{
                    fontSize: "0.72rem",
                    color: "var(--color-text-muted)",
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                    marginBottom: "8px",
                }}>
                    データ管理
                </div>
                <div className="card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--color-text-primary)" }}>
                                データエクスポート
                            </div>
                            <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", marginTop: "2px" }}>
                                Standard プラン以上で利用可能
                            </div>
                        </div>
                        <button
                            onClick={() => alert("Standard プラン以上でご利用いただけます。")}
                            style={{
                                border: "1px solid #C7C7CC",
                                background: "none",
                                borderRadius: "var(--radius-pill)",
                                padding: "8px 14px",
                                fontSize: "0.78rem",
                                color: "var(--color-text-muted)",
                                cursor: "pointer",
                                fontFamily: "inherit",
                                whiteSpace: "nowrap",
                            }}
                        >
                            🔒 準備中
                        </button>
                    </div>
                </div>
            </div>

            {/* 免責フッター */}
            <p className="disclaimer-footer">
                ※ 医療行為ではありません。症状が続く場合は主治医・皮膚科へご相談ください。
            </p>
        </>
    );
}
