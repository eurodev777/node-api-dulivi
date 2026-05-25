import dotenv from 'dotenv'
dotenv.config()

import http from 'http'
import { WebSocketServer } from 'ws'

import app from './app.js'
import { initializeDatabase } from './db/db.js'

const PORT = Number(process.env.PORT) || 3000

// cria servidor HTTP
const server = http.createServer(app)

// websocket server
export const wss = new WebSocketServer({ server })

// conexão websocket
wss.on('connection', (ws) => {
	console.log('Cliente websocket conectado')

	ws.send(
		JSON.stringify({
			type: 'CONNECTED',
			message: 'Websocket conectado com sucesso',
		}),
	)

	ws.on('close', () => {
		console.log('Cliente desconectado')
	})
})

initializeDatabase()
	.then(async () => {
		console.log('Banco de dados pronto!')

		server.listen(PORT, () => {
			console.log(`Servidor rodando em http://localhost:${PORT}`)
		})
	})
	.catch((err) => {
		console.error('Erro ao inicializar banco:', err)
		process.exit(1)
	})