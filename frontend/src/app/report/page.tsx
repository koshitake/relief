"use client";

// 主治医向けレポートページです（Full プラン専用）。
// 期間を選択してブラウザの印刷機能でPDF保存または印刷できます。

import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/store/UseAppStore";
import { useAuth } from "@/hooks/UseAuth";
import { useTranslations } from "@/hooks/UseTranslations";
import type { ReportRecord } from "@/app/api/report/route";

type Period = "1m" | "3m" | "6m";

// 日付を見やすい形式に変換する（例: "2026-05-17" → "2026年5月17日"）
function formatDay(day: string, locale: "ja" | "en"): string {
    const [y, m, d] = day.split("-").map(Number);
    return locale === "ja"
        ? `${y}年${m}月${d}日`
        : `${y}/${String(m).padStart(2, "0")}/${String(d).padStart(2, "0")}`;
}

// 今日の日付を整形する
function formatToday(locale: "ja" | "en"): string {
    const now = new Date();
    return formatDay(now.toISOString().slice(0, 10), locale);
}

export default function ReportPage() {
    const { user, loading } = useAuth();
    const plan = useAppStore((s) => s.plan);
    const locale = useAppStore((s) => s.locale);
    const t = useTranslations();

    const [period, setPeriod] = useState<Period>("1m");
    const [records, setRecords] = useState<ReportRecord[]>([]);
    const [fetching, setFetching] = useState(false);

    const loadRecords = useCallback(() => {
        setFetching(true);
        fetch(`/api/report?period=${period}`)
            .then((r) => r.json())
            .then((json: unknown) => {
                setRecords(Array.isArray(json) ? (json as ReportRecord[]) : []);
            })
            .catch(() => setRecords([]))
            .finally(() => setFetching(false));
    }, [period]);

    // 期間が変わるたびに再取得する
    useEffect(() => {
        if (user && plan === "full") {
            loadRecords();
        }
    }, [user, plan, loadRecords]);

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

    // Full プラン以外はアクセス不可
    if (plan !== "full") {
        return (
            <div style={{ textAlign: "center", padding: "60px 24px", color: "var(--color-text-muted)" }}>
                <div style={{ fontSize: "2rem", marginBottom: "16px" }}>🔒</div>
                <div style={{ fontSize: "0.9rem" }}>{t.report.fullPlanOnly}</div>
            </div>
        );
    }

    return (
        <>
            {/* 印刷時に非表示にするヘッダー・操作エリア */}
            <style>{`
                @media print {
                    .no-print, .bottom-nav, header { display: none !important; }
                    .print-only { display: block !important; }
                    body { background: white !important; font-size: 11pt; }
                    table { border-collapse: collapse; width: 100%; font-size: 9pt; }
                    th, td { border: 1px solid #ccc; padding: 4px 6px; vertical-align: top; }
                    th { background: #f0f0f0; font-weight: bold; }
                }
                .print-only { display: none; }
            `}</style>

            {/* 画面上の操作エリア（印刷時非表示） */}
            <div className="no-print" style={{ paddingTop: "24px", paddingBottom: "16px" }}>
                <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "16px" }}>
                    {t.report.title}
                </div>

                {/* 期間選択 */}
                <div style={{ marginBottom: "16px" }}>
                    <div style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", marginBottom: "8px" }}>
                        {t.report.period}
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                        {(["1m", "3m", "6m"] as Period[]).map((p) => {
                            const label = p === "1m" ? t.report.period1m
                                : p === "3m" ? t.report.period3m : t.report.period6m;
                            return (
                                <button
                                    key={p}
                                    onClick={() => setPeriod(p)}
                                    style={{
                                        padding: "8px 16px",
                                        borderRadius: "var(--radius-pill)",
                                        border: period === p
                                            ? "1.5px solid var(--color-accent)"
                                            : "1px solid var(--color-border)",
                                        background: period === p
                                            ? "rgba(0,122,255,0.1)"
                                            : "var(--color-input-bg)",
                                        color: period === p
                                            ? "var(--color-accent)"
                                            : "var(--color-text-secondary)",
                                        fontSize: "0.82rem",
                                        fontWeight: period === p ? 600 : 400,
                                        cursor: "pointer",
                                        fontFamily: "inherit",
                                    }}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* 印刷ボタン */}
                <button
                    onClick={() => window.print()}
                    disabled={fetching || records.length === 0}
                    style={{
                        width: "100%",
                        border: "none",
                        background: "var(--color-accent)",
                        color: "#fff",
                        borderRadius: "var(--radius-pill)",
                        padding: "12px",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        cursor: (fetching || records.length === 0) ? "default" : "pointer",
                        fontFamily: "inherit",
                        opacity: (fetching || records.length === 0) ? 0.4 : 1,
                        marginBottom: "16px",
                    }}
                >
                    {t.report.print}
                </button>
            </div>

            {/* 印刷時のみ表示するヘッダー */}
            <div className="print-only" style={{ marginBottom: "16px" }}>
                <h2 style={{ margin: "0 0 4px", fontSize: "14pt" }}>{t.report.title}</h2>
                <div style={{ fontSize: "9pt", color: "#666" }}>
                    {t.report.generatedAt(formatToday(locale))}
                </div>
            </div>

            {/* レコードテーブル */}
            {fetching ? (
                <div className="no-print" style={{ textAlign: "center", color: "var(--color-text-muted)", padding: "24px" }}>
                    {t.report.loading}
                </div>
            ) : records.length === 0 ? (
                <p style={{ color: "var(--color-text-muted)", textAlign: "center", fontSize: "0.85rem" }}>
                    {t.report.noData}
                </p>
            ) : (
                <div style={{ overflowX: "auto" }}>
                    <table style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: "0.78rem",
                    }}>
                        <thead>
                            <tr>
                                {[
                                    t.report.date,
                                    t.report.itchScore,
                                    t.report.itchArea,
                                    t.report.water,
                                    t.report.carbs,
                                    t.report.salt,
                                    t.report.meals,
                                    t.report.note,
                                ].map((header) => (
                                    <th
                                        key={header}
                                        style={{
                                            padding: "6px 8px",
                                            textAlign: "left",
                                            background: "var(--color-input-bg)",
                                            borderBottom: "2px solid var(--color-border)",
                                            whiteSpace: "nowrap",
                                            color: "var(--color-text-secondary)",
                                            fontSize: "0.7rem",
                                            fontWeight: 600,
                                        }}
                                    >
                                        {header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {records.map((rec) => (
                                <tr key={rec.day} style={{ borderBottom: "1px solid var(--color-border)" }}>
                                    <td style={{ padding: "6px 8px", whiteSpace: "nowrap", color: "var(--color-text-primary)" }}>
                                        {formatDay(rec.day, locale)}
                                    </td>
                                    <td style={{ padding: "6px 8px", textAlign: "center", fontWeight: 700, color: rec.itchScore >= 5 ? "#FF3B30" : "var(--color-text-primary)" }}>
                                        {rec.itchScore}
                                    </td>
                                    <td style={{ padding: "6px 8px", color: "var(--color-text-secondary)", fontSize: "0.72rem" }}>
                                        {rec.itchArea.join("・") || "—"}
                                    </td>
                                    <td style={{ padding: "6px 8px", textAlign: "right", color: "var(--color-text-primary)" }}>
                                        {rec.waterMl > 0 ? rec.waterMl.toLocaleString() : "—"}
                                    </td>
                                    <td style={{ padding: "6px 8px", textAlign: "right", color: "var(--color-text-primary)" }}>
                                        {rec.carbsG !== null ? rec.carbsG : "—"}
                                    </td>
                                    <td style={{ padding: "6px 8px", textAlign: "right", color: "var(--color-text-primary)" }}>
                                        {rec.saltG !== null ? rec.saltG : "—"}
                                    </td>
                                    <td style={{ padding: "6px 8px", color: "var(--color-text-secondary)", maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {rec.mealsText || "—"}
                                    </td>
                                    <td style={{ padding: "6px 8px", color: "var(--color-text-secondary)", maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {rec.note || "—"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* 免責事項 */}
            <p style={{
                fontSize: "0.7rem",
                color: "var(--color-text-muted)",
                marginTop: "24px",
                lineHeight: 1.7,
                paddingBottom: "32px",
            }}>
                {t.report.disclaimer}
            </p>
        </>
    );
}
