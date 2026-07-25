/**
 * Aggregate-only Sahara member source audit for Customer.io readiness.
 *
 * Supabase Auth is the production identity source. Firebase Auth is a legacy
 * reconciliation source only. This script deliberately prints no email
 * addresses, names, phone numbers, or user IDs.
 *
 * Required environment:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH
 *
 * Usage:
 *   npm run customerio:audit-members
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth as getFirebaseAuth } from 'firebase-admin/auth';
import { createClient } from '@supabase/supabase-js';

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function normalizedEmail(email: string | null | undefined): string | null {
  const value = email?.trim().toLowerCase();
  return value && value.includes('@') ? value : null;
}

async function listSupabaseUsers() {
  const client = createClient(
    requiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const users = [];
  let page = 1;

  while (true) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 1000) return users;
    page += 1;
  }
}

async function listFirebaseUsers() {
  const inlineServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  const rawServiceAccount = inlineServiceAccount
    ? inlineServiceAccount
    : await readFile(resolve(requiredEnv('FIREBASE_SERVICE_ACCOUNT_PATH')), 'utf8');
  const serviceAccount = JSON.parse(rawServiceAccount) as {
    project_id: string;
    client_email: string;
    private_key: string;
  };

  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId: serviceAccount.project_id,
        clientEmail: serviceAccount.client_email,
        privateKey: serviceAccount.private_key,
      }),
      projectId: serviceAccount.project_id,
    });
  }

  const users = [];
  let pageToken: string | undefined;
  do {
    const page = await getFirebaseAuth().listUsers(1000, pageToken);
    users.push(...page.users);
    pageToken = page.pageToken;
  } while (pageToken);
  return users;
}

async function main() {
  const [supabaseUsers, firebaseUsers] = await Promise.all([
    listSupabaseUsers(),
    listFirebaseUsers(),
  ]);
  const supabaseEmails = new Set(
    supabaseUsers.map((user) => normalizedEmail(user.email)).filter(Boolean),
  );
  const firebaseEmails = new Set(
    firebaseUsers.map((user) => normalizedEmail(user.email)).filter(Boolean),
  );
  const overlap = [...supabaseEmails].filter((email) => firebaseEmails.has(email)).length;
  const firebaseOnly = [...firebaseEmails].filter((email) => !supabaseEmails.has(email)).length;
  const supabaseOnly = [...supabaseEmails].filter((email) => !firebaseEmails.has(email)).length;
  const migratedMetadata = supabaseUsers.filter(
    (user) =>
      typeof user.user_metadata?.firebase_uid === 'string' ||
      user.user_metadata?.imported_from === 'firebase',
  ).length;

  console.log(
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        canonicalSource: 'supabase',
        legacySource: 'firebase',
        supabaseAuthUsers: supabaseUsers.length,
        firebaseAuthUsers: firebaseUsers.length,
        emailOverlap: overlap,
        firebaseOnlyByEmail: firebaseOnly,
        supabaseOnlyByEmail: supabaseOnly,
        firebaseDisabledUsers: firebaseUsers.filter((user) => user.disabled).length,
        supabaseUsersWithFirebaseMetadata: migratedMetadata,
        policy: 'aggregate audit only; no Customer.io writes; no PII output',
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }),
  );
  process.exitCode = 1;
});
