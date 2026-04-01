import { createClient } from 'redis'

const client = createClient({
	url: 'rediss://default:gQAAAAAAAV-wAAIncDJmN2U5YWI2MDZlNjk0NmNhODdhZmI0ZWQwN2M4NmU1ZHAyOTAwMzI@deep-silkworm-90032.upstash.io:6379',
})

client.on('error', (err) => {
	console.error('Erro ao conectar no Redis:', err)
})

// Exporta uma função para garantir conexão única
let isConnected = false

export async function getRedisClient() {
	if (!isConnected) {
		await client.connect()
		isConnected = true
	}
	return client
}
