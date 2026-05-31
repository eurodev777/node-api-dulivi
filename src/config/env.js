import dotenv from 'dotenv'
dotenv.config()

// TURSO
export const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL
export const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN
// SUPABASE
export const SUPABASE_API_KEY = process.env.SUPABASE_API_KEY
// CRIPTOGRAFIA
export const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY
export const JWT_SECRET = process.env.JWT_SECRET
// IA
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY
// PAGAMENTOS
export const ASAAS_API_KEY = process.env.ASAAS_API_KEY
export const ASAAS_BASE_URL = 'https://api-sandbox.asaas.com/v3'
// process.env.NODE_ENV === 'production' ? 'https://api.asaas.com/v3' : 'https://api-sandbox.asaas.com/v3'
