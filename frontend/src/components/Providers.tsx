"use client";

// NextAuth の SessionProvider でアプリ全体をラップします。
// locale が変わった際に <html lang> を同期します。
// layout.tsx はサーバーコンポーネントのため、このクライアントラッパーが必要です。

import { useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import { useAppStore } from "@/store/UseAppStore";

function LangSync() {
    const locale = useAppStore((s) => s.locale);
    useEffect(() => {
        document.documentElement.lang = locale;
    }, [locale]);
    return null;
}

interface ProvidersProps {
    children: React.ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
    return (
        <SessionProvider>
            <LangSync />
            {children}
        </SessionProvider>
    );
}
