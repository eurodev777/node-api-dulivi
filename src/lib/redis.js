import { createClient } from 'redis'

const client = createClient({
	url: 'rediss://default:gQAAAAAAAWiqAAIncDE1MjdmNGUyMmZkYWM0ODBhOWRmNjJkN2VlZjU0NThlOHAxOTIzMzA@probable-termite-92330.upstash.io:6379',
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
