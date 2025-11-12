#!/usr/bin/env node
/**
 * Test Supabase Connection and RLS Permissions
 *
 * This script tests if teardown can actually see the groups
 * created by test users. Helps diagnose RLS policy issues.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/db/database.types";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.test
dotenv.config({
  path: path.resolve(__dirname, "..", ".env.test"),
  override: true,
});

async function testConnection() {
  console.log("\n╔════════════════════════════════════════════╗");
  console.log("║  Test Supabase Connection & RLS           ║");
  console.log("╚════════════════════════════════════════════╝\n");

  const supabaseUrl = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY");
    process.exit(1);
  }

  console.log("📋 Configuration:");
  console.log(`   SUPABASE_URL: ${supabaseUrl.substring(0, 40)}...`);
  console.log(`   ANON_KEY: ${supabaseAnonKey.substring(0, 20)}...`);
  console.log();

  const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const testUserIds = [process.env.E2E_USERNAME_ID, process.env.E2E_2_USERNAME_ID].filter(Boolean) as string[];

  console.log("👥 Test user IDs:");
  testUserIds.forEach((id, i) => {
    console.log(`   ${i + 1}. ${id}`);
  });
  console.log();

  // Test 1: Query ALL groups (no filter)
  console.log("🧪 Test 1: Query ALL groups (no filter)");
  const {
    data: allGroups,
    error: allError,
    count: allCount,
  } = await supabase.from("groups").select("id, name, created_by", { count: "exact" });

  if (allError) {
    console.error("   ❌ Error:", allError.message);
    console.error("   💡 This might be an RLS policy issue!");
  } else {
    console.log(`   ✓ Found ${allCount} groups total`);
    if (allGroups && allGroups.length > 0) {
      console.log(`   📦 First few groups:`);
      allGroups.slice(0, 3).forEach((g, i) => {
        console.log(`      ${i + 1}. ${g.name} (created_by: ${g.created_by?.substring(0, 8)}...)`);
      });
    }
  }
  console.log();

  // Test 2: Query groups by test user IDs
  console.log("🧪 Test 2: Query groups created by test users");
  const {
    data: testGroups,
    error: testError,
    count: testCount,
  } = await supabase.from("groups").select("id, name, created_by", { count: "exact" }).in("created_by", testUserIds);

  if (testError) {
    console.error("   ❌ Error:", testError.message);
  } else {
    console.log(`   ✓ Found ${testCount} groups by test users`);
    if (testGroups && testGroups.length > 0) {
      console.log(`   📦 Test groups:`);
      testGroups.forEach((g, i) => {
        console.log(`      ${i + 1}. ${g.name}`);
        console.log(`         created_by: ${g.created_by}`);
      });
    } else {
      console.log(`   ⚠️  No groups found!`);
      console.log(`   💡 Possible reasons:`);
      console.log(`      - Groups were already deleted`);
      console.log(`      - UUID doesn't match`);
      console.log(`      - RLS policy blocks access`);
    }
  }
  console.log();

  // Test 3: Query groups with TEARDOWN in name
  console.log("🧪 Test 3: Query groups with 'TEARDOWN' in name");
  const {
    data: teardownGroups,
    error: teardownError,
    count: teardownCount,
  } = await supabase.from("groups").select("id, name, created_by", { count: "exact" }).ilike("name", "%TEARDOWN%");

  if (teardownError) {
    console.error("   ❌ Error:", teardownError.message);
  } else {
    console.log(`   ✓ Found ${teardownCount} groups with TEARDOWN in name`);
    if (teardownGroups && teardownGroups.length > 0) {
      console.log(`   📦 Groups:`);
      teardownGroups.forEach((g, i) => {
        console.log(`      ${i + 1}. ${g.name}`);
        console.log(`         created_by: ${g.created_by}`);
        const isTestUser = testUserIds.includes(g.created_by || "");
        console.log(`         is test user: ${isTestUser ? "✅ YES" : "❌ NO"}`);
      });
    }
  }
  console.log();

  // Test 4: Check RLS policies
  console.log("🧪 Test 4: Check RLS status");
  const { data: rlsData, error: rlsError } = await supabase
    .rpc("exec", {
      sql: `
        SELECT 
          schemaname,
          tablename,
          rowsecurity
        FROM pg_tables
        WHERE schemaname = 'public' AND tablename = 'groups';
      `,
    })
    .single();

  if (rlsError) {
    console.log("   ℹ️  Cannot check RLS (requires elevated permissions)");
  } else {
    console.log(`   RLS enabled: ${rlsData?.rowsecurity}`);
  }
  console.log();

  // Summary
  console.log("╔════════════════════════════════════════════╗");
  console.log("║  Summary                                   ║");
  console.log("╚════════════════════════════════════════════╝");
  console.log(`Total groups in DB: ${allCount || 0}`);
  console.log(`Groups by test users: ${testCount || 0}`);
  console.log(`Groups with TEARDOWN: ${teardownCount || 0}`);
  console.log();

  if (testCount === 0 && allCount && allCount > 0) {
    console.log("⚠️  WARNING: Database has groups but none by test users!");
    console.log("💡 Possible fixes:");
    console.log("   1. Check if E2E_USERNAME_ID matches the actual user UUID");
    console.log("   2. Run this SQL in Supabase Dashboard:");
    console.log("");
    console.log("      SELECT id, email FROM auth.users WHERE email LIKE '%test%';");
    console.log("");
    console.log("   3. Compare the UUID with E2E_USERNAME_ID in .env.test");
  }

  if (testCount === 0 && allCount === 0) {
    console.log("✅ Database is clean - no groups found");
  }

  if (testCount && testCount > 0) {
    console.log("✅ Found test groups - teardown should work!");
    console.log(`   Run: npm run test:e2e:cleanup`);
  }
}

testConnection().catch(console.error);
