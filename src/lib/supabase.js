import { createClient } from '@supabase/supabase-js'
import { SUPABASE_API_KEY } from '../config/env.js'

const api_key = SUPABASE_API_KEY //process.env.SUPABASE_API_KEY

const supabase = createClient('https://nhjelkpvlxqkibdlzzvm.supabase.co', api_key)

export default supabase
