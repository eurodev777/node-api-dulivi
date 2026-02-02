import { createClient } from 'redis'

const client = createClient({
	url: 'rediss://default:AbBZAAIncDJjODMzYzE2ZTE5M2U0ZmRkYTA5ZDY2N2FmYmNkN2NiMXAyNDUxNDU@fresh-foxhound-45145.upstash.io:6379',
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
