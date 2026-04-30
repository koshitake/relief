"use client";

// かゆみセクションコンポーネントです。
// SVGモックアップに沿い、部位入力とスライダーを白カード内に収めます。

import { useAppStore } from "@/store/UseAppStore";
import { MAX_ITCH_SCORE } from "@/constants/AppConstants";

interface ItchSectionProps {
    day: string;
}

export default function ItchSection({ day }: ItchSectionProps) {
    const { getOrCreateRecord, updateRecord } = useAppStore();
    const record = getOrCreateRecord(day);

    // スライダーの塗りつぶし率（0〜100%）を計算する
    const fillPercent = (record.itchScore / MAX_ITCH_SCORE) * 100;

    return (
        <div className="card">
            <div className="section-label">かゆみ</div>

            {/* かゆみの部位入力 */}
            <div style={{ marginBottom: "14px" }}>
                <label
                    htmlFor="itch-area"
                    style={{
                        display: "block",
                        fontSize: "0.8rem",
                        color: "var(--color-text-secondary)",
                        marginBottom: "6px",
                    }}
                >
                    部位（任意）
                </label>
                <input
                    id="itch-area"
                    type="text"
                    value={record.itchArea}
                    onChange={(e: { target: { value: string } }) =>
                        updateRecord(day, { itchArea: e.target.value })
                    }
                    placeholder="例: ひじ / 首 / 背中"
                    maxLength={100}
                />
            </div>

            {/* かゆみスコアスライダー */}
            <div>
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        marginBottom: "10px",
                    }}
                >
                    <label
                        htmlFor="itch-score"
                        style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}
                    >
                        かゆみスコア
                    </label>
                    {/* 現在値を Space Grotesk で大きく表示する */}
                    <span>
                        <span
                            style={{
                                fontFamily: "'Space Grotesk', sans-serif",
                                fontSize: "1.6rem",
                                fontWeight: 700,
                                color: "var(--color-text-primary)",
                            }}
                        >
                            {record.itchScore}
                        </span>
                        <span
                            style={{
                                fontSize: "0.8rem",
                                color: "var(--color-text-muted)",
                                marginLeft: "3px",
                            }}
                        >
                            / {MAX_ITCH_SCORE}
                        </span>
                    </span>
                </div>

                {/* グラデーション塗りつぶしを CSS カスタムプロパティで実現する */}
                <input
                    id="itch-score"
                    type="range"
                    min={0}
                    max={MAX_ITCH_SCORE}
                    value={record.itchScore}
                    onChange={(e: { target: { value: string } }) =>
                        updateRecord(day, { itchScore: Number(e.target.value) })
                    }
                    style={{
                        background: `linear-gradient(90deg, #007AFF ${fillPercent}%, #E5E5EA ${fillPercent}%)`,
                    }}
                />

                {/* 最小・最大ラベル */}
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.7rem",
                        color: "var(--color-text-muted)",
                        marginTop: "4px",
                    }}
                >
                    <span>0（なし）</span>
                    <span>10（最大）</span>
                </div>
            </div>
        </div>
    );
}
