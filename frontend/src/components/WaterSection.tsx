"use client";

// 水分摂取量セクションコンポーネントです。
// 時刻（現在時刻・編集可）と量を入力してログとして追加する方式です。

import { useCallback, useMemo, useRef, useState } from "react";
import { DayRecord, WaterLog, calcTotalWaterMl } from "@/types/DayRecord";
import { MAX_WATER_ML, MIN_WATER_TARGET_ML, MAX_WATER_TARGET_ML } from "@/constants/AppConstants";
import { useTranslations } from "@/hooks/UseTranslations";

interface WaterSectionProps {
    record: DayRecord;
    // 水分ログはその場でDBに保存する。updater は最新ログ配列を受け取り新しい配列を返す
    saveWaterLogs: (updater: (prev: WaterLog[]) => WaterLog[]) => Promise<void>;
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

export default function WaterSection({ record, saveWaterLogs, waterTargetMl, setWaterTargetMl }: WaterSectionProps) {
    const t = useTranslations();
    // 目標設定の編集モード
    const [editingTarget, setEditingTarget] = useState(false);
    const [targetInput, setTargetInput] = useState(String(waterTargetMl));

    // 追加フォームの状態（時刻は現在時刻で初期化）
    const [entryTime, setEntryTime] = useState(getCurrentTime);
    const [entryMl, setEntryMl] = useState("");
    // 任意入力ボタン押下時に量フィールドへフォーカスするための ref
    const mlInputRef = useRef<HTMLInputElement>(null);

    // ログの編集状態（時刻・水分量）
    const [editingLogIndex, setEditingLogIndex] = useState<number | null>(null);
    const [editingTime, setEditingTime] = useState("");
    const [editingMl, setEditingMl] = useState("");

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

    // クイック選択: 既存の入力値に加算する
    function handleQuickSelect(amount: number) {
        setEntryMl((prev) => String((Number(prev) || 0) + amount));
    }

    // 任意入力: 量フィールドをクリアしてフォーカスする
    function handleCustomInput() {
        setEntryMl("");
        mlInputRef.current?.focus();
    }

    // 追加: 入力内容を検証してログに追記し即時保存する
    async function handleAdd() {
        const ml = Number(entryMl);
        if (!entryTime || isNaN(ml) || ml <= 0) return;

        const newLog: WaterLog = { time: entryTime, ml };
        await saveWaterLogs((prev) => {
            if (calcTotalWaterMl(prev) + ml > MAX_WATER_ML) return prev;
            return sortLogsByTime([...prev, newLog]);
        });

        // 追加後はフォームをリセット（時刻は現在時刻に更新）
        setEntryMl("");
        setEntryTime(getCurrentTime());
    }

    // ログの編集開始（時刻と水分量を同時に編集できる）
    function handleEditLogStart(index: number, currentTime: string, currentMl: number) {
        setEditingLogIndex(index);
        setEditingTime(currentTime);
        setEditingMl(String(currentMl));
    }

    // ログの保存（時刻と水分量を更新して即時保存する）
    async function handleEditLogSave() {
        if (editingLogIndex === null || !editingTime) return;
        const ml = Number(editingMl);
        if (isNaN(ml) || ml <= 0) return;
        const idx = editingLogIndex;
        const time = editingTime;
        await saveWaterLogs((prev) =>
            sortLogsByTime(prev.map((log, i) => (i === idx ? { ...log, time, ml } : log)))
        );
        setEditingLogIndex(null);
    }

    // ログ削除: 指定インデックスのエントリを取り除いて即時保存する
    const handleDeleteLog = useCallback(
        (index: number) => {
            saveWaterLogs((prev) => prev.filter((_, i) => i !== index));
        },
        [saveWaterLogs],
    );

    // レンダリングごとに新配列を生成しないよう useMemo で記憶する（rerender-memo）
    const reversedLogs = useMemo(() => [...record.waterLogs].reverse(), [record.waterLogs]);

    const totalMl = calcTotalWaterMl(record.waterLogs);
    const percent = Math.min(100, Math.max(0, (totalMl / waterTargetMl) * 100));
    const canAdd = entryTime.length > 0 && Number(entryMl) > 0;

    return (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {/* 即時反映を示す上部アクセントバー */}
            <div style={{ height: "4px", background: "var(--color-accent)", borderRadius: "18px 18px 0 0" }} />

            <div style={{ padding: "16px" }}>
            <div className="section-label">{t.water.title}</div>

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
                    {t.water.dailyTarget}
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
                            {t.water.done}
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
                        aria-label={t.water.changeTargetAriaLabel}
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
                        {t.water.time}
                    </span>
                    <input
                        type="time"
                        value={entryTime}
                        onChange={(e) => setEntryTime(e.target.value)}
                        style={{ width: "auto", fontSize: "0.9rem", flex: "none" }}
                    />
                    {/* 現在時刻にリセットするボタン */}
                    <button
                        onClick={() => setEntryTime(getCurrentTime())}
                        style={{
                            border: "none",
                            background: "var(--color-accent-bg)",
                            color: "var(--color-accent)",
                            borderRadius: "var(--radius-pill)",
                            padding: "6px 10px",
                            fontSize: "0.72rem",
                            fontWeight: 600,
                            cursor: "pointer",
                            fontFamily: "inherit",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {t.water.currentTime}
                    </button>
                </div>

                {/* 量の入力: 任意入力 + プリセットボタン */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", minWidth: "28px" }}>
                        {t.water.amount}
                    </span>
                    <button
                        className="btn-quick"
                        onClick={handleCustomInput}
                        aria-label={t.water.customInputAriaLabel}
                    >
                        {t.water.customInput}
                    </button>
                    {QUICK_ADD_OPTIONS.map((amount) => (
                        <button
                            key={amount}
                            className="btn-quick"
                            onClick={() => handleQuickSelect(amount)}
                            aria-label={t.water.selectAmountAriaLabel(amount)}
                        >
                            +{amount}ml
                        </button>
                    ))}
                </div>

                {/* 量の数値フィールド + クリア + 追加ボタン */}
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
                    {entryMl !== "" ? (
                        <button
                            onClick={() => setEntryMl("")}
                            aria-label={t.water.clearInputAriaLabel}
                            style={{
                                border: "none",
                                background: "none",
                                cursor: "pointer",
                                color: "var(--color-text-muted)",
                                fontSize: "1rem",
                                lineHeight: 1,
                                padding: "4px",
                            }}
                        >
                            ×
                        </button>
                    ) : null}

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
                        {t.water.add}
                    </button>
                </div>
            </div>

            {/* 水分ログ一覧（記録がある場合のみ表示） */}
            {record.waterLogs.length > 0 ? (
                <div>
                    <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", marginBottom: "6px" }}>
                        {t.water.recordList}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        {/* reversedLogs は useMemo で記憶済み。元インデックスは全体長から逆算する */}
                        {reversedLogs.map((log, reversedIndex) => {
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
                                        {/* 時刻フィールド */}
                                        <input
                                            type="time"
                                            value={editingTime}
                                            onChange={(e) => setEditingTime(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && handleEditLogSave()}
                                            style={{ fontSize: "0.85rem", flex: "none" }}
                                            autoFocus
                                        />
                                        {/* 水分量フィールド */}
                                        <input
                                            type="number"
                                            inputMode="numeric"
                                            value={editingMl}
                                            min={1}
                                            max={MAX_WATER_ML}
                                            onChange={(e) => setEditingMl(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && handleEditLogSave()}
                                            style={{ width: "90px", fontSize: "0.85rem", textAlign: "right" }}
                                        />
                                        <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>ml</span>
                                        <button
                                            onClick={handleEditLogSave}
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
                                            {t.water.save}
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
                                            {t.water.cancel}
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        {/* 時刻をタップで編集モードへ */}
                                        <button
                                            onClick={() => handleEditLogStart(i, log.time, log.ml)}
                                            aria-label={t.water.editTimeAriaLabel(log.time)}
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
                                        {/* 水分量をタップで編集モードへ */}
                                        <button
                                            onClick={() => handleEditLogStart(i, log.time, log.ml)}
                                            aria-label={t.water.editAmountAriaLabel(log.ml)}
                                            style={{
                                                border: "none",
                                                background: "none",
                                                cursor: "pointer",
                                                fontSize: "0.88rem",
                                                fontWeight: 600,
                                                color: "var(--color-accent)",
                                                flex: 1,
                                                textAlign: "right",
                                                marginRight: "4px",
                                                fontFamily: "inherit",
                                                textDecoration: "underline dotted",
                                            }}
                                        >
                                            {log.ml} ml
                                        </button>
                                        <button
                                            onClick={() => handleDeleteLog(i)}
                                            aria-label={t.water.deleteLogAriaLabel(log.time, log.ml)}
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
            ) : null}
            </div>{/* padding wrapper end */}
        </div>
    );
}
