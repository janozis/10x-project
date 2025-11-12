/**
 * Helper function for per-test cleanup
 *
 * Use this in tests that need to clean up after themselves
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/db/database.types";

export async function cleanupTestData() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("⚠️  Cannot cleanup - missing Supabase credentials");
    return;
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const testUserIds = [process.env.E2E_USERNAME_ID, process.env.E2E_2_USERNAME_ID].filter(Boolean) as string[];

  if (testUserIds.length === 0) {
    return;
  }

  // Find test groups
  const { data: testGroups } = await supabase.from("groups").select("id").in("created_by", testUserIds);

  if (!testGroups || testGroups.length === 0) {
    return;
  }

  const testGroupIds = testGroups.map((g) => g.id);

  // Find related data
  const { data: testActivities } = await supabase.from("activities").select("id").in("group_id", testGroupIds);

  const testActivityIds = testActivities?.map((a) => a.id) || [];

  // Delete in order (respecting foreign keys)
  if (testActivityIds.length > 0) {
    await supabase.from("ai_evaluations").delete().in("activity_id", testActivityIds);
    await supabase.from("activity_editors").delete().in("activity_id", testActivityIds);
    await supabase.from("activity_schedules").delete().in("activity_id", testActivityIds);
  }

  await supabase.from("group_tasks").delete().in("group_id", testGroupIds);
  await supabase.from("activities").delete().in("group_id", testGroupIds);
  await supabase.from("camp_days").delete().in("group_id", testGroupIds);
  await supabase.from("group_memberships").delete().in("group_id", testGroupIds);
  await supabase.from("groups").delete().in("id", testGroupIds);
}
