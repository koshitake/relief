// NextAuth のデフォルト型を拡張して session.user.id を使えるようにします。

import "next-auth";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            email: string;
            name?: string | null;
            image?: string | null;
        };
    }
}
