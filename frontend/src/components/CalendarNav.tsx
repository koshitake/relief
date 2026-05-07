"use client";

// 日付ナビゲーションコンポーネントです。
// 前日/翌日ボタン、日付表示、カレンダーポップアップ、今日へのショートカットを提供します。

import { useState } from "react";
import { useAppStore } from "@/store/UseAppStore";

// 日本語の曜日ラベル（日=0）
const DAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];

// 今日の日付を YYYY-MM-DD 形式で返す（ローカル時刻ベースでタイムゾーンずれを防ぐ）
function getTodayString(): string {
    const d = new Date();
    return toDateStr(d);
}

// Date オブジェクトを YYYY-MM-DD 文字列に変換する
function toDateStr(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

// 日付文字列（YYYY-MM-DD）を n 日ずらして返す
function shiftDate(dateStr: string, days: number): string {
    const date = new Date(dateStr);
    // タイムゾーンのずれを防ぐため UTC で計算する
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}

// YYYY-MM-DD を「YYYY年M月D日」形式に変換する
function formatDisplayDate(dateStr: string): string {
    const [year, month, day] = dateStr.split("-");
    return `${year}年${Number(month)}月${Number(day)}日`;
}

// YYYY-MM-DD から「〇曜日」を取得する
function getDayName(dateStr: string): string {
    const date = new Date(dateStr + "T00:00:00");
    return DAY_NAMES[date.getDay()] + "曜日";
}

// 指定の年月のカレンダーグリッドを生成する（日曜始まり、6週 × 7日 = 最大 42 セル）
function getCalendarDays(
    year: number,
    month: number,
): Array<{ dateStr: string; isCurrentMonth: boolean }> {
    const result: Array<{ dateStr: string; isCurrentMonth: boolean }> = [];

    // 月初の曜日（0=日）分だけ前月の日を埋める
    const firstWeekday = new Date(year, month, 1).getDay();
    for (let i = firstWeekday; i > 0; i--) {
        result.push({ dateStr: toDateStr(new Date(year, month, 1 - i)), isCurrentMonth: false });
    }

    // 当月の日を埋める
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
        result.push({ dateStr: toDateStr(new Date(year, month, d)), isCurrentMonth: true });
    }

    // 末尾を翌月の日で 7 の倍数になるまで埋める
    const tail = (7 - (result.length % 7)) % 7;
    for (let d = 1; d <= tail; d++) {
        result.push({ dateStr: toDateStr(new Date(year, month + 1, d)), isCurrentMonth: false });
    }

    return result;
}

export default function CalendarNav() {
    // セレクターで必要な値だけ購読し、他の状態変化による不要な再レンダリングを防ぐ
    const selectedDay = useAppStore((s) => s.selectedDay);
    const setSelectedDay = useAppStore((s) => s.setSelectedDay);
    const today = getTodayString();
    const isToday = selectedDay === today;

    // カレンダーポップアップの開閉状態
    const [calOpen, setCalOpen] = useState(false);
    // カレンダーで表示中の年月（カレンダーを開いた時点で選択中の日付の月に同期する）
    const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
    const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());

    // カレンダーの開閉を切り替える。開くときは選択中の日付の月にビューを合わせる
    function toggleCalendar() {
        if (!calOpen) {
            const d = new Date(selectedDay + "T00:00:00");
            setViewYear(d.getFullYear());
            setViewMonth(d.getMonth());
        }
        setCalOpen((prev) => !prev);
    }

    // カレンダーのビューを前月にする
    function prevMonth() {
        if (viewMonth === 0) {
            setViewMonth(11);
            setViewYear((y) => y - 1);
        } else {
            setViewMonth((m) => m - 1);
        }
    }

    // カレンダーのビューを翌月にする
    function nextMonth() {
        if (viewMonth === 11) {
            setViewMonth(0);
            setViewYear((y) => y + 1);
        } else {
            setViewMonth((m) => m + 1);
        }
    }

    // 日付セルをタップしたら選択してカレンダーを閉じる
    function selectDay(dateStr: string) {
        setSelectedDay(dateStr);
        setCalOpen(false);
    }

    const calDays = getCalendarDays(viewYear, viewMonth);

    return (
        <div style={{ margin: "14px 0" }}>
            {/* 前日 / 日付表示（タップでカレンダー開閉）/ 翌日 */}
            <div
                className="card"
                style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px" }}
            >
                <button
                    className="cal-nav-btn"
                    onClick={() => setSelectedDay(shiftDate(selectedDay, -1))}
                    aria-label="前日"
                >
                    ‹
                </button>

                {/* 日付エリア：タップでカレンダーを開閉する */}
                <button
                    style={{
                        flex: 1,
                        textAlign: "center",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: 0,
                    }}
                    onClick={toggleCalendar}
                    aria-expanded={calOpen}
                    aria-label="カレンダーを開く"
                >
                    <div
                        style={{
                            fontSize: "0.95rem",
                            fontWeight: 600,
                            color: "var(--color-text-primary)",
                            letterSpacing: "0.02em",
                        }}
                    >
                        {formatDisplayDate(selectedDay)}
                    </div>
                    <div
                        style={{
                            fontSize: "0.75rem",
                            color: "var(--color-text-muted)",
                            marginTop: "2px",
                        }}
                    >
                        {getDayName(selectedDay)}&nbsp;
                        {/* 開閉状態を示すシェブロン */}
                        <span style={{ fontSize: "0.65rem" }}>{calOpen ? "▴" : "▾"}</span>
                    </div>
                </button>

                <button
                    className="cal-nav-btn"
                    onClick={() => setSelectedDay(shiftDate(selectedDay, 1))}
                    aria-label="翌日"
                >
                    ›
                </button>
            </div>

            {/* カレンダーポップアップ */}
            {calOpen ? (
                <div className="card cal-popup">
                    {/* 月ナビゲーション */}
                    <div className="cal-header">
                        <button className="cal-nav-btn" onClick={prevMonth} aria-label="前月">
                            ‹
                        </button>
                        <span style={{ fontSize: "0.95rem", fontWeight: 600 }}>
                            {viewYear}年{viewMonth + 1}月
                        </span>
                        <button className="cal-nav-btn" onClick={nextMonth} aria-label="翌月">
                            ›
                        </button>
                    </div>

                    {/* カレンダーグリッド */}
                    <div className="cal-grid">
                        {/* 曜日ヘッダー */}
                        {DAY_NAMES.map((name, i) => (
                            <div
                                key={name}
                                className={`cal-weekday ${i === 0 ? "cal-weekday-sun" : i === 6 ? "cal-weekday-sat" : ""}`}
                            >
                                {name}
                            </div>
                        ))}

                        {/* 日付セル */}
                        {calDays.map(({ dateStr, isCurrentMonth }) => {
                            const dayNum = Number(dateStr.split("-")[2]);
                            const isSelected = dateStr === selectedDay;
                            const isTodayCell = dateStr === today;
                            const weekday = new Date(dateStr + "T00:00:00").getDay();

                            const classes = [
                                "cal-day",
                                isSelected ? "cal-day-selected" : "",
                                !isSelected && isTodayCell ? "cal-day-today" : "",
                                !isCurrentMonth ? "cal-day-other" : "",
                                !isSelected && weekday === 0 ? "cal-day-sun" : "",
                                !isSelected && weekday === 6 ? "cal-day-sat" : "",
                            ]
                                .filter(Boolean)
                                .join(" ");

                            return (
                                <button
                                    key={dateStr}
                                    className={classes}
                                    onClick={() => selectDay(dateStr)}
                                    aria-label={formatDisplayDate(dateStr)}
                                    aria-pressed={isSelected}
                                >
                                    {dayNum}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ) : null}

            {/* 今日以外を表示中のときだけ「今日」ショートカットを表示する */}
            {!isToday ? (
                <div style={{ textAlign: "center", marginTop: "8px" }}>
                    <button
                        className="btn-today"
                        onClick={() => {
                            setSelectedDay(today);
                            setCalOpen(false);
                        }}
                        aria-label="今日の日付へ移動"
                    >
                        今日
                    </button>
                </div>
            ) : null}
        </div>
    );
}
