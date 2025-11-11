/* eslint-disable no-console */
import { test as teardown } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/db/database.types";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.test for teardown process
const envPath = path.resolve(__dirname, "..", ".env.test");
console.log(`\n🔧 Teardown loading env from: ${envPath}`);

const result = dotenv.config({
  path: envPath,
  override: true,
});

if (result.error) {
  console.error(`❌ Failed to load .env.test:`, result.error);
} else {
  console.log(`✅ Loaded .env.test successfully`);
}

/**
 * Global Teardown: Clean Supabase Database After Each Test
 *
 * This teardown runs after ALL tests to remove test data created during test runs.
 * It ensures database isolation and prevents test data accumulation.
 *
 * Note: This does NOT delete test users from auth.users - they are reused across test runs.
 */

/**
 * Create a Supabase client for database cleanup operations
 * Uses service role key for admin-level access to delete test data
 */
function createSupabaseAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_KEY;

  console.log(`🔍 Debug - SUPABASE_URL present: ${!!supabaseUrl}`);
  console.log(`🔍 Debug - SUPABASE_ANON_KEY present: ${!!supabaseAnonKey}`);

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env.test. " +
        "Teardown requires these variables to clean up test data."
    );
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Delete all test data created by test users
 * Respects foreign key constraints by deleting in proper order
 */
async function cleanupTestData(supabase: ReturnType<typeof createSupabaseAdminClient>) {
  console.log("\n🧹 Starting database cleanup...");

  const testUserIds = [process.env.E2E_USERNAME_ID, process.env.E2E_2_USERNAME_ID].filter(Boolean) as string[];

  if (testUserIds.length === 0) {
    console.warn("⚠️  No test user IDs found. Skipping cleanup.");
    return;
  }

  console.log(`   Test user IDs to clean: ${testUserIds.join(", ")}`);

  try {
    // Step 1: Find all groups created by test users
    const { data: testGroups, error: groupsError } = await supabase
      .from("groups")
      .select("id")
      .in("created_by", testUserIds);

    if (groupsError) {
      console.error("❌ Error fetching test groups:", groupsError);
      throw groupsError;
    }

    const testGroupIds = testGroups?.map((g) => g.id) || [];
    console.log(`   Found ${testGroupIds.length} groups to clean`);

    if (testGroupIds.length === 0) {
      console.log("✓  No groups to clean - database already clean");
      return;
    }

    // Step 2: Find all activities in test groups
    const { data: testActivities, error: activitiesError } = await supabase
      .from("activities")
      .select("id")
      .in("group_id", testGroupIds);

    if (activitiesError) {
      console.error("❌ Error fetching test activities:", activitiesError);
      throw activitiesError;
    }

    const testActivityIds = testActivities?.map((a) => a.id) || [];
    console.log(`   Found ${testActivityIds.length} activities to clean`);

    // Step 3: Find all camp_days in test groups
    const { data: testCampDays, error: campDaysError } = await supabase
      .from("camp_days")
      .select("id")
      .in("group_id", testGroupIds);

    if (campDaysError) {
      console.error("❌ Error fetching test camp days:", campDaysError);
      throw campDaysError;
    }

    const testCampDayIds = testCampDays?.map((cd) => cd.id) || [];
    console.log(`   Found ${testCampDayIds.length} camp days to clean`);

    // DELETE in order respecting foreign key constraints:

    // 1. Delete AI evaluations (references activities)
    if (testActivityIds.length > 0) {
      const { error: evalError } = await supabase.from("ai_evaluations").delete().in("activity_id", testActivityIds);

      if (evalError) console.error("❌ Error deleting ai_evaluations:", evalError);
      else console.log("   ✓ Cleaned ai_evaluations");
    }

    // 2. Delete activity editors (references activities + users)
    if (testActivityIds.length > 0) {
      const { error: editorsError } = await supabase
        .from("activity_editors")
        .delete()
        .in("activity_id", testActivityIds);

      if (editorsError) console.error("❌ Error deleting activity_editors:", editorsError);
      else console.log("   ✓ Cleaned activity_editors");
    }

    // 3. Delete activity schedules (references activities + camp_days)
    if (testActivityIds.length > 0 || testCampDayIds.length > 0) {
      // Delete by activity_id
      if (testActivityIds.length > 0) {
        const { error: schedError } = await supabase
          .from("activity_schedules")
          .delete()
          .in("activity_id", testActivityIds);

        if (schedError) console.error("❌ Error deleting activity_schedules (by activity):", schedError);
      }

      // Also delete by camp_day_id to be thorough
      if (testCampDayIds.length > 0) {
        const { error: schedError2 } = await supabase
          .from("activity_schedules")
          .delete()
          .in("camp_day_id", testCampDayIds);

        if (schedError2) console.error("❌ Error deleting activity_schedules (by camp_day):", schedError2);
      }

      console.log("   ✓ Cleaned activity_schedules");
    }

    // 4. Delete group tasks (references groups + optionally activities)
    if (testGroupIds.length > 0) {
      const { error: tasksError } = await supabase.from("group_tasks").delete().in("group_id", testGroupIds);

      if (tasksError) console.error("❌ Error deleting group_tasks:", tasksError);
      else console.log("   ✓ Cleaned group_tasks");
    }

    // 5. Delete activities (references groups)
    if (testActivityIds.length > 0) {
      const { error: actError } = await supabase.from("activities").delete().in("id", testActivityIds);

      if (actError) console.error("❌ Error deleting activities:", actError);
      else console.log("   ✓ Cleaned activities");
    }

    // 6. Delete camp days (references groups)
    if (testCampDayIds.length > 0) {
      const { error: daysError } = await supabase.from("camp_days").delete().in("id", testCampDayIds);

      if (daysError) console.error("❌ Error deleting camp_days:", daysError);
      else console.log("   ✓ Cleaned camp_days");
    }

    // 7. Delete group memberships (references groups + users)
    if (testGroupIds.length > 0) {
      const { error: membError } = await supabase.from("group_memberships").delete().in("group_id", testGroupIds);

      if (membError) console.error("❌ Error deleting group_memberships:", membError);
      else console.log("   ✓ Cleaned group_memberships");
    }

    // 8. Delete groups (root of the hierarchy)
    if (testGroupIds.length > 0) {
      const { error: grpError } = await supabase.from("groups").delete().in("id", testGroupIds);

      if (grpError) console.error("❌ Error deleting groups:", grpError);
      else console.log("   ✓ Cleaned groups");
    }

    console.log("✅ Database cleanup completed successfully\n");
  } catch (error) {
    console.error("❌ Database cleanup failed:", error);
    // Don't throw - we don't want to fail the entire test suite if cleanup fails
    // It's better to log the error and continue
  }
}

/**
 * Playwright teardown hook
 * Runs after all tests complete
 */
teardown("cleanup database", async () => {
  const supabase = createSupabaseAdminClient();
  await cleanupTestData(supabase);
});
