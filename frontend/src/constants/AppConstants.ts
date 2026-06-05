// アプリ全体で使用する定数を一元管理するファイルです。
// 数値や文字列を直接コードに書く（ハードコード）のを避けるため定数化しています。

// 無料プランで保持する記録の最大日数（1ヶ月分）
export const MAX_RECORD_DAYS = 31;

// かゆみスコアの最大値（1〜5の5段階）
export const MAX_ITCH_SCORE = 5;

// かゆみスコアのアイコン（インデックス0=未入力、1〜5がスコア値に対応）
export const ITCH_SCORE_ICONS = ["", "😊", "🙂", "😐", "😟", "😣"] as const;

// 水分入力の設定（ml単位）
export const MAX_WATER_ML = 5000;
export const WATER_STEP_ML = 100;

// 水分目標のデフォルト値（ユーザーが変更可能。ストアの waterTargetMl を参照すること）
export const DEFAULT_WATER_TARGET_ML = 1500;

// 糖質目標のデフォルト・入力範囲（ユーザーが設定可能）
export const DEFAULT_CARBS_TARGET_G = 130;
export const MIN_CARBS_TARGET_G = 10;
export const MAX_CARBS_TARGET_G = 400;

// 塩分目標のデフォルト・入力範囲（ユーザーが設定可能）
export const DEFAULT_SALT_TARGET_G = 10;
export const MIN_SALT_TARGET_G = 0.5;
export const MAX_SALT_TARGET_G = 30;

// タンパク質目標のデフォルト・入力範囲（ユーザーが設定可能）
export const DEFAULT_PROTEIN_TARGET_G = 60;
export const MIN_PROTEIN_TARGET_G = 10;
export const MAX_PROTEIN_TARGET_G = 300;

// 水分目標の入力範囲
export const MIN_WATER_TARGET_ML = 100;
export const MAX_WATER_TARGET_ML = 5000;
