export type AppRole = "admin" | "user";

export interface AuthContextState {
  isLoading: boolean;
  isAuthenticated: boolean;
  userId: string | null;
  email: string | null;
  role: AppRole;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}
