import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vvsrtdqlkkrwitxvleip.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2c3J0ZHFsa2tyd2l0eHZsZWlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzODkxNzgsImV4cCI6MjA3MTk2NTE3OH0.K9Aw_tZCTdRwOvW_LVWgZU0Hibi4R4VgZox9l0ifuNA';


export const supabase = createClient(supabaseUrl, supabaseAnonKey);
