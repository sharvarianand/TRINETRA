import { createClient } from '@/utils/supabase/server';
import { DEMO_OPERATOR, isSupabaseConfigured, type SessionUser } from './demoAuth';

/**
 * Resolve the current operator in Server Components.
 * Returns null when Supabase is live and unauthenticated.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    return {
      id: user.id,
      email: user.email || '',
      firstName: user.user_metadata?.first_name || user.email?.split('@')[0] || 'Operator',
      lastName: user.user_metadata?.last_name || '',
      isDemo: false,
    };
  }

  return { ...DEMO_OPERATOR };
}
