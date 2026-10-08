import { createClient } from "@/lib/supabase/client";
import { ROLE_TABLE, ROLE_USER_ID_COLUMN } from "@/lib/auth/roles";

export interface UserRow {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  created_at: string | null;
}

export async function listUsers() {
  const supabase = createClient();
  return supabase
    .from(ROLE_TABLE)
    .select("id, full_name, email, role, created_at")
    .order("created_at", { ascending: false });
}

export async function updateUser(userId: string, payload: Partial<UserRow>) {
  const supabase = createClient();
  return supabase.from(ROLE_TABLE).update(payload).eq(ROLE_USER_ID_COLUMN, userId);
}

export async function deleteUser(userId: string) {
  const supabase = createClient();
  return supabase.from(ROLE_TABLE).delete().eq(ROLE_USER_ID_COLUMN, userId);
}
