// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://usuncgqfmawjsqwerala.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzdW5jZ3FmbWF3anNxd2VyYWxhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY4NTQ1MDQsImV4cCI6MjA4MjQzMDUwNH0.m-oF5IE5RdJB7CL9qMjUM8F_nUgNpPMfasI17WeFE40';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});