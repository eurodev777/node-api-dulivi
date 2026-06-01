import { getTursoClient } from '../lib/turso.js'
import { migrate } from './migrate.js'

// ✅ Inicializa o banco ao rodar a API
export const initializeDatabase = async () => {
	const turso = getTursoClient()

	try {
		try {
			await migrate()
		} catch (err) {
			console.error('❌ Erro ao rodar migrate:', err.message)
		}

		const stores = await turso.execute(`SELECT * FROM stores`)
		console.log('Banco iniciado com sucesso: ', stores.rows)
	} catch (error) {
		console.error('Erro ao criar/verificar tabela:', error.message)
	}
}
