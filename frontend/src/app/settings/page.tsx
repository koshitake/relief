"use client";

// 設定画面です。ニックネーム変更、目標設定、言語切り替え、有料プランへのアップグレードができます。

import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { useAppStore } from "@/store/UseAppStore";
import { useAuth } from "@/hooks/UseAuth";
import { useUserSettings } from "@/hooks/UseUserSettings";
import { useTranslations } from "@/hooks/UseTranslations";
import { MIN_CARBS_TARGET_G, MAX_CARBS_TARGET_G, MIN_SALT_TARGET_G, MAX_SALT_TARGET_G, MIN_PROTEIN_TARGET_G, MAX_PROTEIN_TARGET_G } from "@/constants/AppConstants";

// プラン定義（Free / Full の2プラン構成）
const ALL_PLANS = [
    { key: "free" as const, name: "Free" },
    { key: "full" as const, name: "Full" },
];

export default function SettingsPage() {
    const { data: session, update } = useSession();
    const { user, loading } = useAuth();
    const { saveNutritionTargets } = useUserSettings();
    const t = useTranslations();

    const displayName = useAppStore((s) => s.displayName);
    const setDisplayName = useAppStore((s) => s.setDisplayName);
    const carbsTargetG = useAppStore((s) => s.carbsTargetG);
    const saltTargetG = useAppStore((s) => s.saltTargetG);
    const proteinTargetG = useAppStore((s) => s.proteinTargetG);
    const locale = useAppStore((s) => s.locale);
    const setLocale = useAppStore((s) => s.setLocale);
    const plan = useAppStore((s) => s.plan);
    const setPlan = useAppStore((s) => s.setPlan);

    const [nicknameInput, setNicknameInput] = useState(displayName);
    const [saving, setSaving] = useState(false);
    const [saveResult, setSaveResult] = useState<"success" | "error" | null>(null);

    const [carbsInput, setCarbsInput] = useState(carbsTargetG);
    const [saltInput, setSaltInput] = useState(saltTargetG);
    const [proteinInput, setProteinInput] = useState(proteinTargetG);
    const [nutritionSaving, setNutritionSaving] = useState(false);
    const [nutritionSaveResult, setNutritionSaveResult] = useState<"success" | "error" | null>(null);

    // DBからストアに設定が読み込まれたら入力欄を同期する
    useEffect(() => { setCarbsInput(carbsTargetG); }, [carbsTargetG]);
    useEffect(() => { setSaltInput(saltTargetG); }, [saltTargetG]);
    useEffect(() => { setProteinInput(proteinTargetG); }, [proteinTargetG]);
    useEffect(() => { setNicknameInput(displayName); }, [displayName]);

    // バックアップ関連の状態
    const [backupState, setBackupState] = useState<"idle" | "running" | "success" | "error">("idle");
    const [restoreState, setRestoreState] = useState<"idle" | "running" | "success" | "error">("idle");

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
            // JWTトークンを更新して、リロード後も最新のニックネームが反映されるようにする
            await update();
        } else {
            setSaveResult("error");
        }
    }

    async function handleNutritionTargetSave() {
        const carbs = Number(carbsInput);
        const salt = Number(saltInput);
        const protein = Number(proteinInput);
        if (carbs < MIN_CARBS_TARGET_G || carbs > MAX_CARBS_TARGET_G) return;
        if (salt < MIN_SALT_TARGET_G || salt > MAX_SALT_TARGET_G) return;
        if (protein < MIN_PROTEIN_TARGET_G || protein > MAX_PROTEIN_TARGET_G) return;

        setNutritionSaving(true);
        setNutritionSaveResult(null);
        try {
            saveNutritionTargets(carbs, salt, protein);
            setNutritionSaveResult("success");
        } catch {
            setNutritionSaveResult("error");
        } finally {
            setNutritionSaving(false);
        }
    }

    // バックアップを実行する
    async function handleBackup() {
        // Drive スコープ未取得の場合は再サインインを促す
        if (!session?.hasDriveScope) {
            signIn("google");
            return;
        }
        setBackupState("running");
        const res = await fetch("/api/backup", { method: "POST" });
        if (res.ok) {
            setBackupState("success");
        } else {
            setBackupState("error");
        }
    }

    // バックアップから復元する
    async function handleRestore() {
        if (!confirm(t.settings.restoreConfirm)) return;
        setRestoreState("running");
        const res = await fetch("/api/restore", { method: "POST" });
        setRestoreState(res.ok ? "success" : "error");
    }

    // プランを切り替えてDBに保存する（決済処理は未実装）
    function handlePlanChange(next: "free" | "full") {
        if (next === plan) return;
        setPlan(next);
        fetch("/api/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ plan: next }),
        });
    }

    // 言語を切り替えてDBに保存する
    function handleLocaleChange(next: "ja" | "en") {
        if (next === locale) return;
        setLocale(next);
        fetch("/api/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ locale: next }),
        });
    }

    if (loading) {
        return (
            <div style={{ textAlign: "center", paddingTop: "40vh", color: "var(--color-text-muted)" }}>
                {t.common.loading}
            </div>
        );
    }

    if (!user) {
        return (
            <div style={{ textAlign: "center", paddingTop: "40vh", color: "var(--color-text-muted)" }}>
                {t.common.loginRequired}
            </div>
        );
    }

    return (
        <>
            {/* ページタイトル */}
            <div style={{ paddingTop: "24px", paddingBottom: "16px" }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
                    {t.settings.title}
                </div>
            </div>

            {/* プロフィール */}
            <div className="card" style={{ marginBottom: "12px" }}>
                <div className="section-label">{t.settings.profile}</div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                        type="text"
                        value={nicknameInput}
                        onChange={(e) => {
                            setNicknameInput(e.target.value);
                            setSaveResult(null);
                        }}
                        maxLength={50}
                        placeholder={t.settings.nickname}
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
                        {saving ? t.settings.saving : t.settings.change}
                    </button>
                </div>
                {saveResult === "success" ? (
                    <p style={{ fontSize: "0.75rem", color: "#34C759", marginTop: "8px", margin: "8px 0 0" }}>
                        {t.settings.nicknameChanged}
                    </p>
                ) : null}
                {saveResult === "error" ? (
                    <p style={{ fontSize: "0.75rem", color: "#FF3B30", marginTop: "8px", margin: "8px 0 0" }}>
                        {t.settings.nicknameError}
                    </p>
                ) : null}
            </div>

            {/* 目標設定 */}
            <div className="card" style={{ marginBottom: "12px" }}>
                <div className="section-label">{t.settings.goals}</div>

                {/* 糖質目標 */}
                <div style={{ marginBottom: "12px" }}>
                    <label
                        htmlFor="carbs-target"
                        style={{ display: "block", fontSize: "0.8rem", color: "var(--color-text-secondary)", marginBottom: "6px" }}
                    >
                        {t.settings.carbsGoal}
                    </label>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <input
                            id="carbs-target"
                            type="number"
                            value={carbsInput}
                            onChange={(e) => { setCarbsInput(Number(e.target.value)); setNutritionSaveResult(null); }}
                            min={MIN_CARBS_TARGET_G}
                            max={MAX_CARBS_TARGET_G}
                            step={1}
                            style={{ flex: 1, fontSize: "0.9rem" }}
                        />
                        <span style={{ fontSize: "0.9rem", color: "var(--color-text-muted)" }}>g</span>
                    </div>
                </div>

                {/* 塩分目標 */}
                <div style={{ marginBottom: "12px" }}>
                    <label
                        htmlFor="salt-target"
                        style={{ display: "block", fontSize: "0.8rem", color: "var(--color-text-secondary)", marginBottom: "6px" }}
                    >
                        {t.settings.saltGoal}
                    </label>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <input
                            id="salt-target"
                            type="number"
                            value={saltInput}
                            onChange={(e) => { setSaltInput(Number(e.target.value)); setNutritionSaveResult(null); }}
                            min={MIN_SALT_TARGET_G}
                            max={MAX_SALT_TARGET_G}
                            step={0.5}
                            style={{ flex: 1, fontSize: "0.9rem" }}
                        />
                        <span style={{ fontSize: "0.9rem", color: "var(--color-text-muted)" }}>g</span>
                    </div>
                </div>

                {/* タンパク質目標 */}
                <div style={{ marginBottom: "12px" }}>
                    <label
                        htmlFor="protein-target"
                        style={{ display: "block", fontSize: "0.8rem", color: "var(--color-text-secondary)", marginBottom: "6px" }}
                    >
                        {t.settings.proteinGoal}
                    </label>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <input
                            id="protein-target"
                            type="number"
                            value={proteinInput}
                            onChange={(e) => { setProteinInput(Number(e.target.value)); setNutritionSaveResult(null); }}
                            min={MIN_PROTEIN_TARGET_G}
                            max={MAX_PROTEIN_TARGET_G}
                            step={1}
                            style={{ flex: 1, fontSize: "0.9rem" }}
                        />
                        <span style={{ fontSize: "0.9rem", color: "var(--color-text-muted)" }}>g</span>
                    </div>
                </div>

                <button
                    onClick={handleNutritionTargetSave}
                    disabled={nutritionSaving}
                    style={{
                        width: "100%",
                        border: "none",
                        background: "var(--color-accent)",
                        color: "#fff",
                        borderRadius: "var(--radius-pill)",
                        padding: "10px",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        opacity: nutritionSaving ? 0.4 : 1,
                    }}
                >
                    {nutritionSaving ? t.settings.saving : t.settings.saveGoals}
                </button>
                {nutritionSaveResult === "success" && (
                    <p style={{ fontSize: "0.75rem", color: "#34C759", margin: "8px 0 0" }}>
                        {t.settings.goalsSaved}
                    </p>
                )}
                {nutritionSaveResult === "error" && (
                    <p style={{ fontSize: "0.75rem", color: "#FF3B30", margin: "8px 0 0" }}>
                        {t.settings.goalsError}
                    </p>
                )}
            </div>

            {/* 言語 / Language */}
            <div className="card" style={{ marginBottom: "12px" }}>
                <div className="section-label">{t.settings.language}</div>
                <select
                    value={locale}
                    onChange={(e) => handleLocaleChange(e.target.value as "ja" | "en")}
                    style={{ marginTop: "4px", fontSize: "0.9rem", width: "100%" }}
                >
                    <option value="ja">日本語</option>
                    <option value="en">English</option>
                </select>
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
                    {t.settings.plan}
                </div>

                {ALL_PLANS.map((p) => {
                    const isCurrentPlan = p.key === plan;
                    const features = t.settings.planFeatures[p.key];

                    return (
                        <div
                            key={p.key}
                            className="card"
                            style={{
                                marginBottom: "8px",
                                border: isCurrentPlan ? "1.5px solid var(--color-accent)" : undefined,
                            }}
                        >
                            <div style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: "8px",
                            }}>
                                <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
                                    {p.name}
                                </span>
                                {isCurrentPlan ? (
                                    <span style={{
                                        fontSize: "0.68rem",
                                        color: "var(--color-accent)",
                                        fontWeight: 600,
                                        border: "1px solid var(--color-accent)",
                                        borderRadius: "var(--radius-pill)",
                                        padding: "2px 8px",
                                    }}>
                                        {t.settings.currentPlanBadge}
                                    </span>
                                ) : (
                                    <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                                        {p.key === "free" ? "" : t.settings.planPrice}
                                    </span>
                                )}
                            </div>
                            <ul style={{ margin: "0 0 12px", paddingLeft: "16px" }}>
                                {features.map((f) => (
                                    <li key={f} style={{
                                        fontSize: "0.78rem",
                                        color: "var(--color-text-secondary)",
                                        lineHeight: 1.9,
                                    }}>
                                        {f}
                                    </li>
                                ))}
                            </ul>
                            {!isCurrentPlan && (
                                <button
                                    onClick={() => handlePlanChange(p.key)}
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
                                    {t.settings.selectPlan(p.name)}
                                </button>
                            )}
                        </div>
                    );
                })}
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
                    {t.settings.dataManagement}
                </div>

                {/* Free プランはバックアップ機能をロック表示 */}
                {plan === "free" ? (
                    <div className="card">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--color-text-primary)" }}>
                                    {t.settings.dataBackup}
                                </div>
                                <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", marginTop: "2px" }}>
                                    {t.settings.backupAvailability}
                                </div>
                            </div>
                            <span style={{
                                fontSize: "0.78rem",
                                color: "var(--color-text-muted)",
                                border: "1px solid #C7C7CC",
                                borderRadius: "var(--radius-pill)",
                                padding: "8px 14px",
                                whiteSpace: "nowrap",
                            }}>
                                {t.settings.preparingBadge}
                            </span>
                        </div>
                    </div>
                ) : (
                    /* Full プランはバックアップ・復元・レポート UI を表示 */
                    <div className="card">
                        {/* バックアップ */}
                        <div style={{ marginBottom: "16px" }}>
                            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "10px" }}>
                                {t.settings.dataBackup}
                            </div>
                            <button
                                onClick={handleBackup}
                                disabled={backupState === "running"}
                                style={{
                                    width: "100%",
                                    border: "none",
                                    background: backupState === "error" ? "#FF3B30" : "var(--color-accent)",
                                    color: "#fff",
                                    borderRadius: "var(--radius-pill)",
                                    padding: "12px",
                                    fontSize: "0.85rem",
                                    fontWeight: 600,
                                    cursor: backupState === "running" ? "default" : "pointer",
                                    fontFamily: "inherit",
                                    opacity: backupState === "running" ? 0.6 : 1,
                                }}
                            >
                                {backupState === "running" ? t.settings.backupRunning
                                    : backupState === "success" ? t.settings.backupSuccess
                                    : backupState === "error"   ? t.settings.backupError
                                    : !session?.hasDriveScope  ? t.settings.backupNeedAuth
                                    : t.settings.backupButton}
                            </button>
                        </div>

                        {/* [Full プランのみ] レポートリンク */}
                        {plan === "full" && (
                            <>
                                <hr style={{ border: "none", borderTop: "1px solid var(--color-border)", margin: "0 0 16px" }} />
                                <div style={{ marginBottom: "16px" }}>
                                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "10px" }}>
                                        {t.report.title}
                                    </div>
                                    <a
                                        href="/report"
                                        style={{
                                            display: "block",
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
                                            textAlign: "center",
                                            textDecoration: "none",
                                            boxSizing: "border-box",
                                        }}
                                    >
                                        {t.report.openLink}
                                    </a>
                                </div>
                            </>
                        )}

                        {/* 区切り線 */}
                        <hr style={{ border: "none", borderTop: "1px solid var(--color-border)", margin: "0 0 16px" }} />

                        {/* 復元 */}
                        <div>
                            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "10px" }}>
                                {t.settings.restoreTitle}
                            </div>
                            <button
                                onClick={handleRestore}
                                disabled={restoreState === "running"}
                                style={{
                                    width: "100%",
                                    border: "1px solid var(--color-border)",
                                    background: "none",
                                    borderRadius: "var(--radius-pill)",
                                    padding: "10px",
                                    fontSize: "0.82rem",
                                    color: restoreState === "error" ? "#FF3B30" : "var(--color-text-secondary)",
                                    cursor: restoreState === "running" ? "default" : "pointer",
                                    fontFamily: "inherit",
                                    opacity: restoreState === "running" ? 0.5 : 1,
                                }}
                            >
                                {restoreState === "running" ? t.settings.restoreRunning
                                    : restoreState === "error" ? t.settings.restoreError
                                    : t.settings.restoreButton}
                            </button>
                            {restoreState === "success" && (
                                <p style={{ fontSize: "0.78rem", color: "#34C759", margin: "10px 0 0" }}>
                                    {t.settings.restoreSuccess}
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* 免責フッター */}
            <p className="disclaimer-footer">
                {t.common.disclaimer}
            </p>
        </>
    );
}
