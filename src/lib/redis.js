import { createClient } from 'redis'

const client = createClient({
	url: 'rediss://default:gQAAAAAAAf_aAAIgcDJjMDIwMjNkMDlkZTE0MjJiOGRkMTAzNzdiYTI1YTJjMg@present-goose-131034.upstash.io:6379',
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
