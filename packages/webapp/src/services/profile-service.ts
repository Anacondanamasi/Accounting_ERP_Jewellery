import { createClient } from "@/lib/supabase/client";
import {
  ADMIN_ROLE_VALUE,
  ROLE_COLUMN,
  ROLE_TABLE,
  ROLE_USER_ID_COLUMN
} from "@/lib/auth/roles";
import type { AppRole } from "@/types/auth";

export async function fetchRoleByUserId(userId: string): Promise<AppRole> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from(ROLE_TABLE)
    .select(ROLE_COLUMN)
    .eq(ROLE_USER_ID_COLUMN, userId)
    .maybeSingle();

  if (error) {
    return "user";
  }

  const role = data?.[ROLE_COLUMN];
  return role === ADMIN_ROLE_VALUE ? "admin" : "user";
}
