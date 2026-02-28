import type { FC, ReactNode } from "react";

export type AuthUser = { uid?: string; [key: string]: unknown } | null;

export function useAuth(): {
  user: AuthUser;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthProvider: FC<{ children?: ReactNode }>;
export default AuthProvider;
