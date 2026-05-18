import dotenv from 'dotenv'
dotenv.config()

export const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL
export const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN
export const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN
export const MP_CLIENT_ID = process.env.MP_CLIENT_ID
export const MP_CLIENT_SECRET = process.env.MP_CLIENT_SECRET
export const MP_REDIRECT_URI = process.env.MP_REDIRECT_URI
export const SUPABASE_API_KEY = process.env.SUPABASE_API_KEY
export const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY
export const JWT_SECRET = process.env.JWT_SECRET
