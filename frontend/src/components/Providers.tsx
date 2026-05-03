"use client";

// Supabase Auth を使用するため、SessionProvider は不要になりました。
// layout.tsx はサーバーコンポーネントのため、このラッパーコンポーネントは残しています。

interface ProvidersProps {
    children: React.ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
    return <>{children}</>;
}
