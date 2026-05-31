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

		// Verifica se já existe alguma loja
		const result = await turso.execute(`SELECT COUNT(*) as count FROM stores`)
		const count = result.rows[0].count

		if (count === 0) {
			console.log('🔰 Inserindo loja padrão...')
			await turso.execute({
				sql: `
					INSERT INTO stores (name, email, password, cpf, image, minimum_order, delivery_time_min, delivery_time_max)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?)
				`,
				args: [
					"Nabih Esfiha's",
					'joaojpmoreira25@gmail.com',
					'senha123',
					'49827089838',
					'https://firebasestorage.googleapis.com/v0/b/brendi-app.appspot.com/o/public%2Fstores%2FiDKFcEEXl3yffAobBax8%2Fimages%2Flogos%2FiDKFcEEXl3yffAobBax8.jpeg?alt=media&token=e4e73f0a-c4bf-47f1-929d-7856302e6192',
					15.0,
					30,
					80,
				],
			})
			console.log('✅ Loja padrão inserida!')
		} else {
			console.log('🔎 Loja já existente, nada inserido.')
		}

		const stores = await turso.execute(`SELECT * FROM stores`)
		console.log('Banco iniciado com sucesso: ', stores.rows)
	} catch (error) {
		console.error('Erro ao criar/verificar tabela:', error.message)
	}
}
