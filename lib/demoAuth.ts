/**
 * Demo-mode auth constants and client/edge-safe utilities.
 *
 * This file has NO server dependencies (no next/headers) so it can be safely
 * imported in Client Components (e.g. LoginPage) and Edge Middleware.
 */
export const DEMO_OPERATOR = {
  id: 'demo-operator',
  email: 'operator@trinetra.local',
  firstName: 'Demo',
  lastName: 'Operator',
  isDemo: true,
} as const;

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  if (!url || !key) return false;
  return !/placeholder|your_/i.test(url) && !/placeholder|your_/i.test(key);
}

export type SessionUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isDemo: boolean;
};
