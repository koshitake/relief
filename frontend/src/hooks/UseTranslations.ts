"use client";

// 現在のロケールに対応する翻訳オブジェクトを返すフックです。
// Zustand ストアの locale に応じて ja / en を切り替えます。

import { useAppStore } from "@/store/UseAppStore";
import { ja } from "@/i18n/ja";
import { en } from "@/i18n/en";

const messages = { ja, en } as const;

export function useTranslations() {
    const locale = useAppStore((s) => s.locale);
    return messages[locale];
}
