import { createBrowserClient } from '@supabase/ssr';
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from './config';

export function createBrowserSupabaseClient() {
  if (!isSupabaseConfigured) throw new Error('Supabase environment variables are missing.');
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
