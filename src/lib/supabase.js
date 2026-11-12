import { createClient } from '@supabase/supabase-js'
import { SUPABASE_API_KEY } from '../config/env.js'

const supabaseUrl = 'https://wkgmcltiodqnwskfrkls.supabase.co'

const supabase = createClient(supabaseUrl, SUPABASE_API_KEY, {
	auth: {
		autoRefreshToken: false,
		persistSession: false,
		detectSessionInUrl: false,
	},
})

export default supabase
