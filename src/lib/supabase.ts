import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

function isPlaceholder(value: string | undefined): boolean {
  if (!value) return true;
  const lower = value.toLowerCase();
  return (
    lower.includes("your-project-id") ||
    lower.includes("your-supabase-anon") ||
    lower.includes("your-anon-key") ||
    lower.includes("your-service-role")
  );
}

function getPublicKey(): string | undefined {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return key && !isPlaceholder(key) ? key : undefined;
}

function getServiceRoleKey(): string | undefined {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return key && !isPlaceholder(key) ? key : undefined;
}

function getServerKey(): string {
  const key = getServiceRoleKey() || getPublicKey();
  if (!key) {
    throw new Error(
      "Missing Supabase API key. Please define NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local."
    );
  }
  return key;
}

declare global {
  var _supabaseServerClient: SupabaseClient | undefined;
  var _supabaseBrowserClient: SupabaseClient | undefined;
}

export function getSupabaseServerClient(): SupabaseClient {
  if (!supabaseUrl || isPlaceholder(supabaseUrl)) {
    throw new Error(
      "Missing or invalid NEXT_PUBLIC_SUPABASE_URL in .env.local. Please set your actual Supabase URL."
    );
  }

  const key = getServerKey();

  if (!globalThis._supabaseServerClient) {
    globalThis._supabaseServerClient = createClient(supabaseUrl, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return globalThis._supabaseServerClient;
}

export function getSupabaseBrowserClient(): SupabaseClient {
  if (!supabaseUrl || isPlaceholder(supabaseUrl)) {
    throw new Error(
      "Missing or invalid NEXT_PUBLIC_SUPABASE_URL in .env.local. Please set your actual Supabase URL."
    );
  }

  const key = getPublicKey();
  if (!key) {
    throw new Error(
      "Missing Supabase public key in .env.local. Please define NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    );
  }

  if (!globalThis._supabaseBrowserClient) {
    globalThis._supabaseBrowserClient = createClient(supabaseUrl, key);
  }

  return globalThis._supabaseBrowserClient;
}

export const SUPABASE_STORAGE_BUCKET =
  process.env.SUPABASE_STORAGE_BUCKET || "pos-images";
