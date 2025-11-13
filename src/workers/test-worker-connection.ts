/**
 * Test Worker Connection Script
 *
 * Diagnostic tool to verify:
 * - Environment variables are set correctly
 * - Service role key is configured (not anon key)
 * - Supabase connection works
 * - Can query ai_evaluation_requests table
 *
 * Usage: npx tsx --env-file=.env src/workers/test-worker-connection.ts
 */

/* eslint-disable no-console */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../db/database.types";

console.log("🔍 Worker Connection Diagnostic Tool\n");
console.log("=".repeat(60));

// Step 1: Check environment variables
console.log("\n📋 Step 1: Checking environment variables...\n");

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
const anonKey = process.env.PUBLIC_SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

console.log(`SUPABASE_URL: ${supabaseUrl ? "✅ SET" : "❌ MISSING"}`);
if (supabaseUrl) {
  console.log(`  → ${supabaseUrl}`);
}

console.log(`\nSUPABASE_SERVICE_ROLE_KEY: ${serviceRoleKey ? "✅ SET" : "❌ MISSING"}`);
if (serviceRoleKey) {
  console.log(`  → ${serviceRoleKey.substring(0, 20)}... (${serviceRoleKey.length} chars)`);
}

console.log(`\nPUBLIC_SUPABASE_KEY (anon): ${anonKey ? "⚠️  SET (should not be used by worker)" : "Not set"}`);
if (anonKey) {
  console.log(`  → ${anonKey.substring(0, 20)}... (${anonKey.length} chars)`);
}

// Step 2: Verify service role key vs anon key
console.log("\n" + "=".repeat(60));
console.log("\n📋 Step 2: Key type verification...\n");

if (!serviceRoleKey) {
  console.error("❌ CRITICAL: SUPABASE_SERVICE_ROLE_KEY is not set!");
  console.error("\nWorker cannot function without service_role key.");
  console.error("Get it from: Supabase Dashboard → Settings → API → service_role key (secret)\n");
  process.exit(1);
}

if (!supabaseUrl) {
  console.error("❌ CRITICAL: SUPABASE_URL is not set!");
  process.exit(1);
}

// Check if service_role key looks valid
const isJWT = serviceRoleKey.startsWith("eyJ");
console.log(`Service role key format: ${isJWT ? "✅ Looks like JWT" : "⚠️  Unexpected format"}`);

if (anonKey && serviceRoleKey === anonKey) {
  console.error("❌ WARNING: service_role key is the same as anon key!");
  console.error("You might be using the wrong key. Check your .env file.");
}

// Step 3: Test connection with service_role key
console.log("\n" + "=".repeat(60));
console.log("\n📋 Step 3: Testing Supabase connection...\n");

let client: ReturnType<typeof createClient<Database>>;

try {
  client = createClient<Database>(supabaseUrl, serviceRoleKey);
  console.log("✅ Supabase client created successfully");
} catch (error) {
  console.error("❌ Failed to create Supabase client:", error);
  process.exit(1);
}

// Step 4: Test basic query (should work with service_role)
console.log("\n" + "=".repeat(60));
console.log("\n📋 Step 4: Testing database access...\n");

try {
  // Test connection with a simple query
  const { data, error } = await client.from("groups").select("id").limit(1);

  if (error) {
    console.error("❌ Failed to query database:", error);
  } else {
    console.log("✅ Successfully queried database (groups table)");
    console.log(`  → Found ${data?.length || 0} record(s)`);
  }
} catch (error) {
  console.error("❌ Exception during query:", error);
}

// Step 5: Test ai_evaluation_requests table specifically
console.log("\n" + "=".repeat(60));
console.log("\n📋 Step 5: Testing ai_evaluation_requests table...\n");

try {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: allRequests, error: allError } = await (client as any)
    .from("ai_evaluation_requests")
    .select("id, activity_id, status, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  if (allError) {
    console.error("❌ Failed to query ai_evaluation_requests table:");
    console.error(`  → Code: ${allError.code}`);
    console.error(`  → Message: ${allError.message}`);
    console.error(`  → Details: ${JSON.stringify(allError.details)}`);
    console.error("\nPossible causes:");
    console.error("  - Table doesn't exist");
    console.error("  - RLS is blocking access (but service_role should bypass this)");
    console.error("  - Wrong database/project");
  } else {
    console.log("✅ Successfully queried ai_evaluation_requests table");
    console.log(`  → Total records: ${allRequests?.length || 0}`);

    if (allRequests && allRequests.length > 0) {
      console.log("\n  Recent requests:");
      allRequests.forEach((req, idx) => {
        console.log(
          `  ${idx + 1}. ID: ${req.id.substring(0, 8)}... | Status: ${req.status} | Created: ${req.created_at}`
        );
      });
    }
  }
} catch (error) {
  console.error("❌ Exception during ai_evaluation_requests query:", error);
}

// Step 6: Test queued requests specifically (what worker looks for)
console.log("\n" + "=".repeat(60));
console.log("\n📋 Step 6: Testing QUEUED requests (worker query)...\n");

try {
  // This is the EXACT query the worker uses
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: queuedRequests, error: queuedError } = await (client as any)
    .from("ai_evaluation_requests")
    .select("id")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(5);

  if (queuedError) {
    console.error("❌ Failed to query queued requests:");
    console.error(`  → Code: ${queuedError.code}`);
    console.error(`  → Message: ${queuedError.message}`);
    console.error(`  → Details: ${JSON.stringify(queuedError.details)}`);
  } else {
    console.log("✅ Successfully queried QUEUED requests");
    console.log(`  → Found ${queuedRequests?.length || 0} queued request(s)`);

    if (queuedRequests && queuedRequests.length > 0) {
      console.log("\n  Queued request IDs:");
      queuedRequests.forEach((req, idx) => {
        console.log(`  ${idx + 1}. ${req.id}`);
      });

      console.log("\n✅ SUCCESS! Worker should be able to process these requests.");
    } else {
      console.log("\n⚠️  No queued requests found.");
      console.log("   This is OK if you haven't created any evaluation requests yet.");
      console.log("   To test: Go to an activity and click 'Poproś o ocenę AI'");
    }
  }
} catch (error) {
  console.error("❌ Exception during queued requests query:", error);
}

// Summary
console.log("\n" + "=".repeat(60));
console.log("\n📊 DIAGNOSTIC SUMMARY\n");

const checks = {
  "Environment variables set": !!(supabaseUrl && serviceRoleKey),
  "Service role key configured": !!serviceRoleKey,
  "Supabase client created": !!client,
};

Object.entries(checks).forEach(([check, passed]) => {
  console.log(`${passed ? "✅" : "❌"} ${check}`);
});

console.log("\n" + "=".repeat(60));
console.log("\n🎯 NEXT STEPS:\n");

if (!serviceRoleKey) {
  console.log("1. Add SUPABASE_SERVICE_ROLE_KEY to your .env file");
  console.log("2. Get it from: Supabase Dashboard → Settings → API → service_role (secret)");
} else {
  console.log("1. If worker still doesn't pick up requests, restart it:");
  console.log("   npm run worker:ai-eval");
  console.log("\n2. Check worker logs for the line:");
  console.log("   [AI Eval Worker] 🔍 Query result: X request(s) with status='queued'");
  console.log("\n3. If worker shows 0 requests but this script shows >0:");
  console.log("   - Make sure worker is using --env-file=.env");
  console.log("   - Check if .env has SUPABASE_SERVICE_ROLE_KEY (not PUBLIC_SUPABASE_KEY)");
}

console.log("\n" + "=".repeat(60) + "\n");
