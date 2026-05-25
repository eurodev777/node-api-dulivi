import dotenv from 'dotenv'
dotenv.config()

import http from 'http'
import { WebSocketServer } from 'ws'

import app from './app.js'
import { initializeDatabase } from './db/db.js'

const PORT = Number(process.env.PORT) || 3000

const server = http.createServer(app)

export const wss = new WebSocketServer({ server })

const clients = new Set()

wss.on('connection', (ws) => {
	clients.add(ws)

	ws.send(
		JSON.stringify({
			type: 'CONNECTED',
			message: 'Websocket conectado com sucesso',
		}),
	)

	ws.on('close', () => {
		clients.delete(ws)
	})
})

export function sendToAll(data) {
	const message = JSON.stringify(data)

	clients.forEach((client) => {
		if (client.readyState === 1) {
			client.send(message)
		}
	})
}

initializeDatabase()
	.then(() => {
		console.log('Banco de dados pronto!')

		server.listen(PORT, () => {
			console.log(`Servidor rodando na porta ${PORT}`)
		})
	})
	.catch((err) => {
		console.error('Erro ao inicializar banco:', err)
		process.exit(1)
	})