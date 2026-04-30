// アプリ全体で使用する定数を一元管理するファイルです。
// 数値や文字列を直接コードに書く（ハードコード）のを避けるため定数化しています。

// 無料プランで保持する記録の最大日数
export const MAX_RECORD_DAYS = 14;

// かゆみスコアの最大値
export const MAX_ITCH_SCORE = 10;

// 水分入力の設定（ml単位）
export const MAX_WATER_ML = 5000;
export const WATER_STEP_ML = 100;

// 水分目標のデフォルト値（ユーザーが変更可能。ストアの waterTargetMl を参照すること）
export const DEFAULT_WATER_TARGET_ML = 1500;

// サマリープログレスバー用の目標値（表示上の基準値）
export const CARBS_TARGET_G = 130;
export const SALT_TARGET_G = 10;

// 水分目標の入力範囲
export const MIN_WATER_TARGET_ML = 100;
export const MAX_WATER_TARGET_ML = 5000;
