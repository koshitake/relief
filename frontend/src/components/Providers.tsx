"use client";

// NextAuth の SessionProvider をアプリ全体に提供するラッパーコンポーネントです。
// layout.tsx はサーバーコンポーネントのため、クライアントコンポーネントとして切り出しています。

import { SessionProvider } from "next-auth/react";

interface ProvidersProps {
    children: React.ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
    return <SessionProvider>{children}</SessionProvider>;
}
