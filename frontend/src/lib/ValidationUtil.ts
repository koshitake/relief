// リクエストのバリデーションに使用する Zod スキーマと検証関数です。

import { z } from "zod";

/** バリデーション結果の型 */
export type ValidationResult<T> =
    | { success: true; data: T }
    | { success: false; error: string };

/** Zodスキーマでリクエストボディを検証する汎用関数 */
export function validateRequest<T>(
    schema: z.ZodSchema<T>,
    body: unknown
): ValidationResult<T> {
    const result = schema.safeParse(body);
    if (!result.success) {
        // エラーメッセージを結合して返す
        const message = result.error.errors.map((e) => e.message).join(", ");
        return { success: false, error: message };
    }
    return { success: true, data: result.data };
}
