"use client";

// NextAuth の SessionProvider でアプリ全体をラップします。
// layout.tsx はサーバーコンポーネントのため、このクライアントラッパーが必要です。

import { SessionProvider } from "next-auth/react";

interface ProvidersProps {
    children: React.ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
    return <SessionProvider>{children}</SessionProvider>;
}
