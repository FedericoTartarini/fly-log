import type { FC, ReactNode } from "react";

export interface AuthContextValue {
  user: { uid: string } | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

export const useAuth: () => AuthContextValue;

declare const AuthProvider: FC<{ children?: ReactNode }>;

export default AuthProvider;
