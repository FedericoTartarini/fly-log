declare module "./AuthContext" {
  import type { FC, ReactNode } from "react";

  export type AuthUser = { uid?: string; [key: string]: any } | null;

  export function useAuth(): {
    user: AuthUser;
    loading: boolean;
    signOut: () => void;
  };

  const AuthProvider: FC<{ children?: ReactNode }>;
  export default AuthProvider;
}
