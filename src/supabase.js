import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ubvqylcyfahbjtzzepds.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVidnF5bGN5ZmFoYmp0enplcGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1OTk1OTksImV4cCI6MjA4ODE3NTU5OX0.Xz5JDz2xmXX09xk_ji1p_JGZhLOHe0J0xSnYi-75Rdw'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
