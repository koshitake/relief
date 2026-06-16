"use client";

// 主治医向けレポートページです（Full プラン専用）。
// 月単位で表示し、前月・翌月ボタンで月を切り替えられます。
// ブラウザの印刷機能でPDF保存または印刷できます。

import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "@/store/UseAppStore";
import { useAuth } from "@/hooks/UseAuth";
import { useTranslations } from "@/hooks/UseTranslations";
import type { ReportRecord } from "@/app/api/report/route";

// かゆみスコアに対応する色を返す
function itchColor(score: number): string {
    if (score === 0) return "var(--color-text-placeholder)";
    if (score <= 2)  return "#34C759";
    if (score === 3) return "#FF9500";
    return "#FF3B30";
}

// 日付を "5/1(月)" 形式に変換する
function formatDayShort(day: string, locale: "ja" | "en"): string {
    const [y, m, d] = day.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    if (locale === "ja") {
        const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
        return `${m}/${d}(${weekdays[date.getDay()]})`;
    }
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return `${m}/${d}(${weekdays[date.getDay()]})`;
}

// 今日の日付を整形する
function formatToday(locale: "ja" | "en"): string {
    const now = new Date();
    const [y, m, d] = [now.getFullYear(), now.getMonth() + 1, now.getDate()];
    return locale === "ja"
        ? `${y}年${m}月${d}日`
        : `${y}/${String(m).padStart(2, "0")}/${String(d).padStart(2, "0")}`;
}

// テーブルヘッダーセルのスタイル
const thStyle: React.CSSProperties = {
    padding: "8px 10px",
    textAlign: "left",
    background: "var(--color-input-bg)",
    borderBottom: "2px solid #D1D1D6",
    whiteSpace: "nowrap",
    color: "var(--color-text-muted)",
    fontSize: "0.68rem",
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
};

// テーブルデータセルのスタイル
function tdStyle(align: "left" | "center" | "right" = "left"): React.CSSProperties {
    return {
        padding: "8px 10px",
        textAlign: align,
        color: "var(--color-text-primary)",
        fontSize: "0.8rem",
        borderBottom: "1px solid var(--color-input-bg)",
        verticalAlign: "top",
    };
}

export default function ReportPage() {
    const { user, loading } = useAuth();
    const plan   = useAppStore((s) => s.plan);
    const locale = useAppStore((s) => s.locale);
    const t      = useTranslations();
    const userId = user?.id;

    // 現在表示中の年・月（デフォルト：今月）
    const now = new Date();
    const [year,  setYear]  = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [records,  setRecords]  = useState<ReportRecord[]>([]);
    const [fetching, setFetching] = useState(false);

    // 翌月ボタンを無効にする（今月より先には進まない）
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

    function goToPrevMonth() {
        if (month === 1) { setYear((y) => y - 1); setMonth(12); }
        else setMonth((m) => m - 1);
    }

    function goToNextMonth() {
        if (isCurrentMonth) return;
        if (month === 12) { setYear((y) => y + 1); setMonth(1); }
        else setMonth((m) => m + 1);
    }

    const loadRecords = useCallback(() => {
        setFetching(true);
        fetch(`/api/report?year=${year}&month=${month}`)
            .then((r) => r.json())
            .then((json: unknown) => setRecords(Array.isArray(json) ? (json as ReportRecord[]) : []))
            .catch(() => setRecords([]))
            .finally(() => setFetching(false));
    }, [year, month]);

    useEffect(() => {
        if (userId && plan === "full") loadRecords();
    }, [userId, plan, loadRecords]);

    // --- ローディング / 未ログイン / プランチェック ---
    if (loading) {
        return <div style={centerStyle}>{t.common.loading}</div>;
    }
    if (!user) {
        return <div style={centerStyle}>{t.common.loginRequired}</div>;
    }
    if (plan !== "full") {
        return (
            <div style={{ textAlign: "center", padding: "60px 24px", color: "var(--color-text-muted)" }}>
                <div style={{ fontSize: "2rem", marginBottom: "16px" }}>🔒</div>
                <div style={{ fontSize: "0.9rem" }}>{t.report.fullPlanOnly}</div>
            </div>
        );
    }

    // --- サマリー計算 ---
    const recordCount = records.length;
    const avgItch = recordCount > 0
        ? (records.reduce((s, r) => s + r.itchScore, 0) / recordCount).toFixed(1)
        : "—";
    const waterRecords = records.filter((r) => r.waterMl > 0);
    const avgWater = waterRecords.length > 0
        ? Math.round(waterRecords.reduce((s, r) => s + r.waterMl, 0) / waterRecords.length)
        : null;

    const monthLabel = t.chart.formatYearMonth(year, month);

    return (
        <>
            <style>{`
                @media print {
                    .no-print, .bottom-nav, header { display: none !important; }
                    .print-only { display: block !important; }
                    body { background: white !important; padding: 0 !important; font-size: 10pt; }
                    .report-table th { background: #f0f0f0 !important; }
                    .report-table td, .report-table th { border: 1px solid #bbb !important; }
                    @page { margin: 15mm; size: A4 landscape; }
                }
                .print-only { display: none; }
                .report-table tr:hover td { background: rgba(0,122,255,0.04); }
            `}</style>

            {/* ===== 印刷時のみ表示するヘッダー ===== */}
            <div className="print-only" style={{ marginBottom: "20px", borderBottom: "2px solid #333", paddingBottom: "12px" }}>
                <div style={{ fontSize: "16pt", fontWeight: 700, marginBottom: "4px" }}>
                    アトピー管理レポート — {monthLabel}
                </div>
                <div style={{ fontSize: "9pt", color: "#555" }}>
                    {t.report.generatedAt(formatToday(locale))}
                    {" "}／ 記録日数: {recordCount}日
                    {" "}／ 平均かゆみ: {avgItch}
                    {avgWater !== null && ` ／ 平均水分: ${avgWater.toLocaleString()}ml`}
                </div>
            </div>

            {/* ===== 月ナビゲーション ===== */}
            <div className="no-print" style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingTop: "20px",
                paddingBottom: "16px",
                gap: "8px",
            }}>
                <button onClick={goToPrevMonth} style={navBtnStyle} aria-label={t.report.prevMonth}>
                    ‹
                </button>
                <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--color-text-primary)", flex: 1, textAlign: "center" }}>
                    {monthLabel}
                </span>
                <button
                    onClick={goToNextMonth}
                    disabled={isCurrentMonth}
                    style={{ ...navBtnStyle, opacity: isCurrentMonth ? 0.3 : 1 }}
                    aria-label={t.report.nextMonth}
                >
                    ›
                </button>
                <button
                    onClick={() => window.print()}
                    disabled={fetching || recordCount === 0}
                    style={{
                        padding: "8px 18px",
                        borderRadius: "var(--radius-pill)",
                        border: "none",
                        background: (fetching || recordCount === 0) ? "#E5E5EA" : "var(--color-accent)",
                        color: (fetching || recordCount === 0) ? "var(--color-text-muted)" : "#fff",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        cursor: (fetching || recordCount === 0) ? "default" : "pointer",
                        fontFamily: "inherit",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                    }}
                >
                    {t.report.print}
                </button>
            </div>

            {/* ===== サマリーバー（画面のみ） ===== */}
            {!fetching && recordCount > 0 && (
                <div className="no-print" style={{
                    display: "flex",
                    gap: "12px",
                    flexWrap: "wrap",
                    padding: "10px 14px",
                    background: "var(--color-card)",
                    borderRadius: "var(--radius-card)",
                    marginBottom: "12px",
                    boxShadow: "var(--shadow-card)",
                }}>
                    <SummaryItem label={t.report.recordDays} value={`${recordCount}${t.report.daysUnit}`} />
                    <Divider />
                    <SummaryItem label={t.report.avgItch} value={avgItch} color={itchColor(parseFloat(avgItch) || 0)} />
                    {avgWater !== null && (
                        <>
                            <Divider />
                            <SummaryItem label={t.report.avgWater} value={`${avgWater.toLocaleString()}ml`} />
                        </>
                    )}
                </div>
            )}

            {/* ===== 記録テーブル ===== */}
            {fetching ? (
                <div style={{ textAlign: "center", color: "var(--color-text-muted)", padding: "40px" }}>
                    {t.report.loading}
                </div>
            ) : recordCount === 0 ? (
                <div style={{ textAlign: "center", color: "var(--color-text-muted)", padding: "40px", fontSize: "0.85rem" }}>
                    {t.report.noData}
                </div>
            ) : (
                <div style={{ overflowX: "auto", borderRadius: "var(--radius-card)", boxShadow: "var(--shadow-card)" }}>
                    <table className="report-table" style={{ width: "100%", borderCollapse: "collapse", background: "var(--color-card)" }}>
                        <thead>
                            <tr>
                                <th style={thStyle}>{t.report.date}</th>
                                <th style={{ ...thStyle, textAlign: "center" }}>{t.report.itchScore}</th>
                                <th style={thStyle}>{t.report.itchArea}</th>
                                <th style={{ ...thStyle, textAlign: "right" }}>{t.report.water}</th>
                                <th style={{ ...thStyle, textAlign: "right" }}>{t.report.carbs}</th>
                                <th style={{ ...thStyle, textAlign: "right" }}>{t.report.salt}</th>
                                <th style={{ ...thStyle, textAlign: "right" }}>{t.report.protein}</th>
                                <th style={thStyle}>{t.report.meals}</th>
                                <th style={thStyle}>{t.report.note}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.map((rec) => (
                                <tr key={rec.day}>
                                    <td style={{ ...tdStyle(), whiteSpace: "nowrap", fontWeight: 500 }}>
                                        {formatDayShort(rec.day, locale)}
                                    </td>
                                    <td style={{ ...tdStyle("center") }}>
                                        {rec.itchScore > 0 ? (
                                            <span style={{
                                                display: "inline-block",
                                                width: "28px",
                                                height: "28px",
                                                lineHeight: "28px",
                                                borderRadius: "50%",
                                                background: itchColor(rec.itchScore),
                                                color: "#fff",
                                                fontWeight: 700,
                                                fontSize: "0.82rem",
                                                textAlign: "center",
                                            }}>
                                                {rec.itchScore}
                                            </span>
                                        ) : (
                                            <span style={{ color: "var(--color-text-placeholder)" }}>—</span>
                                        )}
                                    </td>
                                    <td style={{ ...tdStyle(), fontSize: "0.72rem", color: "var(--color-text-secondary)", maxWidth: "100px" }}>
                                        {rec.itchArea.length > 0 ? rec.itchArea.join("・") : "—"}
                                    </td>
                                    <td style={tdStyle("right")}>
                                        {rec.waterMl > 0 ? rec.waterMl.toLocaleString() : <Dash />}
                                    </td>
                                    <td style={tdStyle("right")}>
                                        {rec.carbsG !== null ? rec.carbsG : <Dash />}
                                    </td>
                                    <td style={tdStyle("right")}>
                                        {rec.saltG !== null ? rec.saltG : <Dash />}
                                    </td>
                                    <td style={tdStyle("right")}>
                                        {rec.proteinG !== null ? rec.proteinG : <Dash />}
                                    </td>
                                    <td style={{ ...tdStyle(), color: "var(--color-text-secondary)", maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {rec.mealsText || <Dash />}
                                    </td>
                                    <td style={{ ...tdStyle(), color: "var(--color-text-secondary)", maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                        {rec.note || <Dash />}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ===== 免責事項 ===== */}
            <p style={{
                fontSize: "0.7rem",
                color: "var(--color-text-muted)",
                marginTop: "24px",
                lineHeight: 1.7,
                paddingBottom: "80px",
            }}>
                {t.report.disclaimer}
            </p>
        </>
    );
}

// ===== 小コンポーネント =====

function SummaryItem({ label, value, color }: { label: string; value: string; color?: string }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <span style={{ fontSize: "0.68rem", color: "var(--color-text-muted)", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                {label}
            </span>
            <span style={{ fontSize: "1rem", fontWeight: 700, color: color ?? "var(--color-text-primary)" }}>
                {value}
            </span>
        </div>
    );
}

function Divider() {
    return <div style={{ width: "1px", background: "var(--color-input-bg)", alignSelf: "stretch", margin: "0 4px" }} />;
}

function Dash() {
    return <span style={{ color: "var(--color-text-placeholder)" }}>—</span>;
}

// ===== スタイル定数 =====

const centerStyle: React.CSSProperties = {
    textAlign: "center",
    paddingTop: "40vh",
    color: "var(--color-text-muted)",
};

const navBtnStyle: React.CSSProperties = {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    border: "none",
    background: "var(--color-input-bg)",
    cursor: "pointer",
    fontSize: "1.5rem",
    lineHeight: "1",
    color: "var(--color-accent)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
};
