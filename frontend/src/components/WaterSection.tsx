"use client";

// 水分摂取量セクションコンポーネントです。
// 時刻（現在時刻・編集可）と量を入力してログとして追加する方式です。

import { useCallback, useRef, useState } from "react";
import { DayRecord, WaterLog, calcTotalWaterMl } from "@/types/DayRecord";
import { MAX_WATER_ML, MIN_WATER_TARGET_ML, MAX_WATER_TARGET_ML } from "@/constants/AppConstants";

interface WaterSectionProps {
    record: DayRecord;
    updateRecord: (patch: Partial<DayRecord> | ((prev: DayRecord) => Partial<DayRecord>)) => void;
    waterTargetMl: number;
    setWaterTargetMl: (ml: number) => void;
}

const QUICK_ADD_OPTIONS = [50, 100, 150] as const;

/** waterLogs を時刻の昇順にソートして新しい配列を返す */
function sortLogsByTime(logs: WaterLog[]): WaterLog[] {
    return [...logs].sort((a, b) => a.time.localeCompare(b.time));
}

/** 現在時刻を "HH:MM" 形式で返す */
function getCurrentTime(): string {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, "0");
    const m = String(now.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
}

export default function WaterSection({ record, updateRecord, waterTargetMl, setWaterTargetMl }: WaterSectionProps) {
    // 目標設定の編集モード
    const [editingTarget, setEditingTarget] = useState(false);
    const [targetInput, setTargetInput] = useState(String(waterTargetMl));

    // 追加フォームの状態（時刻は現在時刻で初期化）
    const [entryTime, setEntryTime] = useState(getCurrentTime);
    const [entryMl, setEntryMl] = useState("");
    // 任意入力ボタン押下時に量フィールドへフォーカスするための ref
    const mlInputRef = useRef<HTMLInputElement>(null);

    // ログ時刻の編集状態
    const [editingLogIndex, setEditingLogIndex] = useState<number | null>(null);
    const [editingTime, setEditingTime] = useState("");

    // 目標水分量の保存
    function handleTargetSave() {
        const val = Number(targetInput);
        if (!isNaN(val) && val >= MIN_WATER_TARGET_ML) {
            setWaterTargetMl(val);
        }
        setEditingTarget(false);
    }

    function handleEditStart() {
        setTargetInput(String(waterTargetMl));
        setEditingTarget(true);
    }

    // クイック選択: 量フィールドにプリセット値をセットする
    function handleQuickSelect(amount: number) {
        setEntryMl(String(amount));
    }

    // 任意入力: 量フィールドをクリアしてフォーカスする
    function handleCustomInput() {
        setEntryMl("");
        mlInputRef.current?.focus();
    }

    // 追加: 入力内容を検証してログに追記する
    // 関数パッチを使うことでrecord.waterLogsへの直接参照を避ける（rerender-memo）
    function handleAdd() {
        const ml = Number(entryMl);
        if (!entryTime || isNaN(ml) || ml <= 0) return;

        const newLog: WaterLog = { time: entryTime, ml };
        updateRecord((prev) => {
            if (calcTotalWaterMl(prev.waterLogs) + ml > MAX_WATER_ML) return {};
            return { waterLogs: sortLogsByTime([...prev.waterLogs, newLog]) };
        });

        // 追加後はフォームをリセット（時刻は現在時刻に更新）
        setEntryMl("");
        setEntryTime(getCurrentTime());
    }

    // ログ時刻の編集開始
    function handleEditTimeStart(index: number, currentTime: string) {
        setEditingLogIndex(index);
        setEditingTime(currentTime);
    }

    // ログ時刻の保存
    function handleEditTimeSave() {
        if (editingLogIndex === null || !editingTime) return;
        const idx = editingLogIndex;
        const time = editingTime;
        updateRecord((prev) => ({
            waterLogs: sortLogsByTime(prev.waterLogs.map((log, i) => (i === idx ? { ...log, time } : log))),
        }));
        setEditingLogIndex(null);
    }

    // ログ削除: 指定インデックスのエントリを取り除く
    // 関数パッチを使うことでrecord.waterLogsを依存配列から除去する（rerender-memo）
    const handleDeleteLog = useCallback(
        (index: number) => {
            updateRecord((prev) => ({
                waterLogs: prev.waterLogs.filter((_, i) => i !== index),
            }));
        },
        [updateRecord],
    );

    const totalMl = calcTotalWaterMl(record.waterLogs);
    const percent = Math.min(100, Math.max(0, (totalMl / waterTargetMl) * 100));
    const canAdd = entryTime.length > 0 && Number(entryMl) > 0;

    return (
        <div className="card">
            <div className="section-label">水分</div>

            {/* 目標水分量の表示・設定 */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "10px",
                }}
            >
                <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                    1日の目標
                </span>

                {editingTarget ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <input
                            type="number"
                            inputMode="numeric"
                            value={targetInput}
                            min={MIN_WATER_TARGET_ML}
                            max={MAX_WATER_TARGET_ML}
                            onChange={(e) => setTargetInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleTargetSave()}
                            style={{ width: "80px", padding: "4px 8px", fontSize: "0.82rem", textAlign: "right" }}
                            autoFocus
                        />
                        <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>ml</span>
                        <button
                            onClick={handleTargetSave}
                            style={{
                                border: "none",
                                background: "var(--color-accent)",
                                color: "#fff",
                                borderRadius: "var(--radius-pill)",
                                padding: "10px 16px",
                                fontSize: "0.82rem",
                                cursor: "pointer",
                                fontFamily: "inherit",
                            }}
                        >
                            完了
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={handleEditStart}
                        style={{
                            border: "none",
                            background: "none",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "2px 6px",
                            borderRadius: "var(--radius-input)",
                        }}
                        aria-label="目標水分量を変更"
                    >
                        <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--color-accent)" }}>
                            {waterTargetMl.toLocaleString()} ml
                        </span>
                        <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>✎</span>
                    </button>
                )}
            </div>

            {/* 水分プログレスグラフ */}
            <div style={{ marginBottom: "16px" }}>
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        marginBottom: "6px",
                    }}
                >
                    <span>
                        <span style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--color-text-primary)", lineHeight: 1 }}>
                            {totalMl.toLocaleString()}
                        </span>
                        <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginLeft: "3px" }}>
                            / {waterTargetMl.toLocaleString()} ml
                        </span>
                    </span>
                    <span style={{ fontSize: "0.82rem", fontWeight: 600, color: percent >= 100 ? "#34C759" : "var(--color-accent)" }}>
                        {Math.round(percent)}%
                    </span>
                </div>
                <div className="water-bar-track" role="progressbar" aria-valuenow={totalMl} aria-valuemax={waterTargetMl}>
                    <div
                        className="water-bar-fill"
                        style={{ width: `${percent}%`, background: percent >= 100 ? "#34C759" : "var(--color-accent)" }}
                    />
                </div>
            </div>

            {/* 水分追加フォーム */}
            <div
                style={{
                    background: "var(--color-input-bg)",
                    borderRadius: "var(--radius-input)",
                    padding: "12px",
                    marginBottom: "14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                }}
            >
                {/* 時刻入力（現在時刻が初期値・編集可） */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", minWidth: "28px" }}>
                        時刻
                    </span>
                    <input
                        type="time"
                        value={entryTime}
                        onChange={(e) => setEntryTime(e.target.value)}
                        style={{ width: "auto", fontSize: "0.9rem", flex: "none" }}
                    />
                </div>

                {/* 量の入力: 任意入力 + プリセットボタン */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", minWidth: "28px" }}>
                        量
                    </span>
                    <button
                        className="btn-quick"
                        onClick={handleCustomInput}
                        aria-label="任意の量を入力"
                    >
                        任意入力
                    </button>
                    {QUICK_ADD_OPTIONS.map((amount) => (
                        <button
                            key={amount}
                            className="btn-quick"
                            onClick={() => handleQuickSelect(amount)}
                            aria-label={`${amount}ml を選択`}
                        >
                            +{amount}ml
                        </button>
                    ))}
                </div>

                {/* 量の数値フィールド + 追加ボタン */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                        ref={mlInputRef}
                        type="number"
                        inputMode="numeric"
                        placeholder="ml"
                        value={entryMl}
                        min={1}
                        max={MAX_WATER_ML}
                        onChange={(e) => setEntryMl(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                        style={{ width: "90px", fontSize: "0.9rem" }}
                    />
                    <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>ml</span>
                    <button
                        onClick={handleAdd}
                        disabled={!canAdd}
                        style={{
                            marginLeft: "auto",
                            border: "none",
                            background: canAdd ? "var(--color-accent)" : "#E5E5EA",
                            color: canAdd ? "#fff" : "var(--color-text-muted)",
                            borderRadius: "var(--radius-pill)",
                            padding: "8px 20px",
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            cursor: canAdd ? "pointer" : "not-allowed",
                            fontFamily: "inherit",
                            transition: "background 0.15s",
                        }}
                    >
                        追加
                    </button>
                </div>
            </div>

            {/* 水分ログ一覧（記録がある場合のみ表示） */}
            {record.waterLogs.length > 0 && (
                <div>
                    <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", marginBottom: "6px" }}>
                        記録一覧
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        {[...record.waterLogs].reverse().map((log, reversedIndex) => {
                        // 内部データは昇順のため、表示用に逆順にした際の元インデックスを計算する
                        const i = record.waterLogs.length - 1 - reversedIndex;
                        return (
                            <div
                                key={`${log.time}-${log.ml}-${i}`}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    background: "var(--color-input-bg)",
                                    borderRadius: "var(--radius-input)",
                                    padding: "6px 10px",
                                    gap: "6px",
                                }}
                            >
                                {editingLogIndex === i ? (
                                    <>
                                        <input
                                            type="time"
                                            value={editingTime}
                                            onChange={(e) => setEditingTime(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && handleEditTimeSave()}
                                            style={{ fontSize: "0.85rem", flex: "none" }}
                                            autoFocus
                                        />
                                        <button
                                            onClick={handleEditTimeSave}
                                            style={{
                                                border: "none",
                                                background: "var(--color-accent)",
                                                color: "#fff",
                                                borderRadius: "var(--radius-pill)",
                                                padding: "10px 16px",
                                                fontSize: "0.82rem",
                                                cursor: "pointer",
                                                fontFamily: "inherit",
                                            }}
                                        >
                                            保存
                                        </button>
                                        <button
                                            onClick={() => setEditingLogIndex(null)}
                                            style={{
                                                border: "none",
                                                background: "none",
                                                cursor: "pointer",
                                                color: "var(--color-text-muted)",
                                                fontSize: "0.82rem",
                                                fontFamily: "inherit",
                                                padding: "10px 8px",
                                            }}
                                        >
                                            キャンセル
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        {/* 時刻をタップで編集モードへ */}
                                        <button
                                            onClick={() => handleEditTimeStart(i, log.time)}
                                            aria-label={`${log.time} を編集`}
                                            style={{
                                                border: "none",
                                                background: "none",
                                                cursor: "pointer",
                                                fontSize: "0.8rem",
                                                color: "var(--color-accent)",
                                                minWidth: "42px",
                                                padding: 0,
                                                fontFamily: "inherit",
                                                textDecoration: "underline dotted",
                                            }}
                                        >
                                            {log.time}
                                        </button>
                                        <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--color-text-primary)", flex: 1, textAlign: "right", marginRight: "4px" }}>
                                            {log.ml} ml
                                        </span>
                                        <button
                                            onClick={() => handleDeleteLog(i)}
                                            aria-label={`${log.time} の ${log.ml}ml を削除`}
                                            style={{
                                                border: "none",
                                                background: "none",
                                                cursor: "pointer",
                                                color: "var(--color-text-muted)",
                                                fontSize: "1rem",
                                                lineHeight: 1,
                                                // タップ領域を 44×44px 以上に確保する
                                                minWidth: "44px",
                                                minHeight: "44px",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                            }}
                                        >
                                            ×
                                        </button>
                                    </>
                                )}
                            </div>
                        );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
