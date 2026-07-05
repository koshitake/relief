// 1日分の記録データを表す型定義です。

/** 水分摂取ログ1件（時刻と摂取量） */
export interface WaterLog {
    /** 記録時刻（"HH:MM" 形式） */
    time: string;
    /** 摂取量（ml） */
    ml: number;
}

export interface DayRecord {
    /** かゆみの部位（複数選択可。DBにはカンマ区切り文字列で保存） */
    itchArea: string[];
    /** かゆみスコア（0〜MAX_ITCH_SCORE） */
    itchScore: number;
    /** 水分摂取ログ（時刻と量を都度記録する方式） */
    waterLogs: WaterLog[];
    /** 運動内容（自由記述） */
    exerciseText: string;
    /** メモ・症状・気づき */
    note: string;
    /** 食事内容（自由記述） */
    mealsText: string;
    /** 糖質（g）手動入力またはAI推定値 */
    carbsG?: number;
    /** 塩分（g）手動入力またはAI推定値 */
    saltG?: number;
    /** タンパク質（g）手動入力またはAI推定値 */
    proteinG?: number;
    /** 脂質（g）手動入力またはAI推定値 */
    lipidG?: number;
}

/** waterLogs の合計水分量（ml）を計算する */
export function calcTotalWaterMl(logs: WaterLog[]): number {
    return logs.reduce((sum, log) => sum + log.ml, 0);
}

/** DayRecord の初期値を生成するファクトリ関数 */
export function createEmptyDayRecord(): DayRecord {
    return {
        itchArea: [],
        itchScore: 0,
        waterLogs: [],
        exerciseText: "",
        note: "",
        mealsText: "",
    };
}
