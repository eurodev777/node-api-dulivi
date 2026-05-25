import { wss } from './server.js'

export const sendToAll = (data) => {
	wss.clients.forEach((client) => {
		if (client.readyState === 1) {
			client.send(JSON.stringify(data))
		}
	})
}