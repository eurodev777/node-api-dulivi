import dotenv from 'dotenv'
dotenv.config()
import app from './app.js'
import { initializeDatabase } from './db/db.js'

const PORT = Number(process.env.PORT) || 3000

initializeDatabase()
	.then(async () => {
		console.log('Banco de dados pronto!')

		app.listen(PORT, () => {
			console.log(`Servidor rodando em http://localhost:${PORT}`)
		})
	})
	.catch((err) => {
		console.error('Erro ao inicializar banco:', err)
		process.exit(1)
	})
