// The ONLY place Supabase credentials appear (context/tech-stack.md).
// The URL and anon key are public by design — RLS is the security boundary.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://rhotxathnmkzbtlgxgjv.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJob3R4YXRobm1remJ0bGd4Z2p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExODk3MzEsImV4cCI6MjA5Njc2NTczMX0.dW-Fhphuyqiz08MOrF_xBwyd8s-uPKNarZWVVUw547k'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
