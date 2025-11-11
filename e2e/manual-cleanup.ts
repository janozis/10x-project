#!/usr/bin/env node
/**
 * Manual Database Cleanup Script
 * 
 * Use this script to manually clean test data from the database
 * without running the full test suite.
 * 
 * Usage:
 *   node e2e/manual-cleanup.ts
 *   # or with tsx:
 *   npx tsx e2e/manual-cleanup.ts
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/db/database.types";
import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.test
dotenv.config({ 
  path: path.resolve(__dirname, "..", ".env.test"),
  override: true 
});

/**
 * Create Supabase client for cleanup operations
 */
function createSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env.test\n" +
      "   Please configure your .env.test file first.\n" +
      "   See: e2e/ENV_TEMPLATE.md for instructions."
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
 */
async function cleanupTestData(supabase: ReturnType<typeof createSupabaseClient>) {
  console.log("\n╔════════════════════════════════════════════╗");
  console.log("║  Manual Database Cleanup for E2E Tests   ║");
  console.log("╚════════════════════════════════════════════╝\n");

  const testUserIds = [
    process.env.E2E_USERNAME_ID,
    process.env.E2E_2_USERNAME_ID,
  ].filter(Boolean) as string[];

  if (testUserIds.length === 0) {
    console.error("❌ No test user IDs found in .env.test");
    console.error("   Please set E2E_USERNAME_ID and/or E2E_2_USERNAME_ID\n");
    process.exit(1);
  }

  console.log("📋 Configuration:");
  console.log(`   Supabase URL: ${process.env.SUPABASE_URL}`);
  console.log(`   Test Users: ${testUserIds.length}`);
  testUserIds.forEach((id, i) => {
    console.log(`     ${i + 1}. ${id}`);
  });
  console.log();

  try {
    // Step 1: Find all groups created by test users
    console.log("🔍 Scanning for test data...");
    const { data: testGroups, error: groupsError } = await supabase
      .from("groups")
      .select("id, name, created_at")
      .in("created_by", testUserIds);

    if (groupsError) {
      console.error("❌ Error fetching groups:", groupsError.message);
      throw groupsError;
    }

    const testGroupIds = testGroups?.map((g) => g.id) || [];
    console.log(`   Found ${testGroupIds.length} groups to clean`);

    if (testGroupIds.length === 0) {
      console.log("\n✨ Database is already clean - no test data found!\n");
      return;
    }

    // Show groups to be deleted
    console.log("\n📦 Groups to be deleted:");
    testGroups?.forEach((g, i) => {
      const date = new Date(g.created_at).toLocaleString();
      console.log(`   ${i + 1}. ${g.name} (created: ${date})`);
    });

    // Step 2: Find related data
    const { data: testActivities } = await supabase
      .from("activities")
      .select("id")
      .in("group_id", testGroupIds);

    const testActivityIds = testActivities?.map((a) => a.id) || [];

    const { data: testCampDays } = await supabase
      .from("camp_days")
      .select("id")
      .in("group_id", testGroupIds);

    const testCampDayIds = testCampDays?.map((cd) => cd.id) || [];

    console.log("\n📊 Related data to be deleted:");
    console.log(`   Activities: ${testActivityIds.length}`);
    console.log(`   Camp Days: ${testCampDayIds.length}`);

    // Confirm deletion
    console.log("\n⚠️  WARNING: This will permanently delete all test data!");
    console.log("   Press Ctrl+C to cancel, or wait 3 seconds to continue...\n");
    
    await new Promise((resolve) => setTimeout(resolve, 3000));

    console.log("🗑️  Starting cleanup...\n");

    // DELETE operations (same order as in global.teardown.ts)
    let totalDeleted = 0;

    // 1. AI evaluations
    if (testActivityIds.length > 0) {
      const { count } = await supabase
        .from("ai_evaluations")
        .delete({ count: "exact" })
        .in("activity_id", testActivityIds);
      console.log(`   ✓ Deleted ${count || 0} ai_evaluations`);
      totalDeleted += count || 0;
    }

    // 2. Activity editors
    if (testActivityIds.length > 0) {
      const { count } = await supabase
        .from("activity_editors")
        .delete({ count: "exact" })
        .in("activity_id", testActivityIds);
      console.log(`   ✓ Deleted ${count || 0} activity_editors`);
      totalDeleted += count || 0;
    }

    // 3. Activity schedules
    if (testActivityIds.length > 0) {
      const { count } = await supabase
        .from("activity_schedules")
        .delete({ count: "exact" })
        .in("activity_id", testActivityIds);
      console.log(`   ✓ Deleted ${count || 0} activity_schedules`);
      totalDeleted += count || 0;
    }

    // 4. Group tasks
    if (testGroupIds.length > 0) {
      const { count } = await supabase
        .from("group_tasks")
        .delete({ count: "exact" })
        .in("group_id", testGroupIds);
      console.log(`   ✓ Deleted ${count || 0} group_tasks`);
      totalDeleted += count || 0;
    }

    // 5. Activities
    if (testActivityIds.length > 0) {
      const { count } = await supabase
        .from("activities")
        .delete({ count: "exact" })
        .in("id", testActivityIds);
      console.log(`   ✓ Deleted ${count || 0} activities`);
      totalDeleted += count || 0;
    }

    // 6. Camp days
    if (testCampDayIds.length > 0) {
      const { count } = await supabase
        .from("camp_days")
        .delete({ count: "exact" })
        .in("id", testCampDayIds);
      console.log(`   ✓ Deleted ${count || 0} camp_days`);
      totalDeleted += count || 0;
    }

    // 7. Group memberships
    if (testGroupIds.length > 0) {
      const { count } = await supabase
        .from("group_memberships")
        .delete({ count: "exact" })
        .in("group_id", testGroupIds);
      console.log(`   ✓ Deleted ${count || 0} group_memberships`);
      totalDeleted += count || 0;
    }

    // 8. Groups
    if (testGroupIds.length > 0) {
      const { count } = await supabase
        .from("groups")
        .delete({ count: "exact" })
        .in("id", testGroupIds);
      console.log(`   ✓ Deleted ${count || 0} groups`);
      totalDeleted += count || 0;
    }

    console.log("\n╔════════════════════════════════════════════╗");
    console.log(`║  ✅ Cleanup completed successfully!       ║`);
    console.log(`║     Total records deleted: ${String(totalDeleted).padEnd(14)}║`);
    console.log("╚════════════════════════════════════════════╝\n");

  } catch (error) {
    console.error("\n❌ Cleanup failed:", error);
    process.exit(1);
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    const supabase = createSupabaseClient();
    await cleanupTestData(supabase);
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { cleanupTestData, createSupabaseClient };

