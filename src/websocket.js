const clients = new Set()

export function addClient(ws) {
	clients.add(ws)
}

export function removeClient(ws) {
	clients.delete(ws)
}

export function sendToAll(data) {
	const message = JSON.stringify(data)

	clients.forEach((client) => {
		if (client.readyState === 1) {
			client.send(message)
		}
	})
}