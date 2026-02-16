import { getRedisClient } from '../../lib/redis.js'
import { v4 as uuidv4 } from 'uuid'
import orderController from './order.controller.js'
import { calculateTotalOrderValue } from '../../utils/calculateTotalOrderValue.js'

class SessionController {
	// Cadastrar nova sessão
	async create(req, res) {
		const data = req.body
		const redis = await getRedisClient()

		const id = uuidv4()
		const sessionId = `checkout:${id}`

		const { shipping = {}, calculatedTotal } = await calculateTotalOrderValue({
			items: data.items,
			fk_store_delivery_area_id: data.fk_store_delivery_area_id || null,
			fk_store_id: data.fk_store_id,
		})

		const sessionData = {
			...data,
			...shipping,
			total_amount: calculatedTotal,
		}

		await redis.setEx(sessionId, 86400, JSON.stringify(sessionData))

		res.send({ order_token: sessionId })
	}
	// Encontrar sessão por ID
	async getById(req, res) {
		const id = req.params.id
		if (!id || typeof id !== 'string') {
			return res.status(400).json({ success: false, error: 'ID inválido' })
		}

		const redis = await getRedisClient()
		const raw_data = await redis.get(id)

		if (!raw_data) {
			return res.status(404).json({ success: false, error: 'Sessão não encontrada' })
		}

		const result = JSON.parse(raw_data)
		return res.json(result)
	}
	// Atualizar sessão
	async update(req, res) {
		const id = req.params.id
		const data = req.body.data

		const redis = await getRedisClient()

		const raw_data = await redis.get(id)
		if (!raw_data) {
			return res.status(404).json({ success: false, error: 'Sessão não encontrada' })
		}

		const order = raw_data ? JSON.parse(raw_data) : {}
		const updatedOrder = { ...order, ...data }

		// 🔥 Se recebeu fk_store_delivery_area_id, recalcula total com frete
		if (data.fk_store_delivery_area_id) {
			const { shipping, calculatedTotal } = await calculateTotalOrderValue({
				items: updatedOrder.items,
				fk_store_delivery_area_id: data.fk_store_delivery_area_id,
				fk_store_id: updatedOrder.fk_store_id,
			})

			Object.assign(updatedOrder, shipping, {
				total_amount: calculatedTotal,
			})
		}

		await redis.setEx(id, 86400, JSON.stringify(updatedOrder))
		return res.json(updatedOrder)
	}
	// Atualizar sessão
	async finish(req, res) {
		const id = req.params.id

		const redis = await getRedisClient()
		const raw_data = await redis.get(id)
		if (!raw_data) {
			return res.status(404).json({ success: false, error: 'Sessão não encontrada' })
		}

		const order_data = raw_data ? JSON.parse(raw_data) : {}

		try {
			const order = await orderController.createFromSession(order_data)
			return res.json(order)
		} catch (error) {
			return res.status(500).json({
				success: false,
				error: 'Erro ao finalizar pedido',
			})
		}
	}
}

export default new SessionController()
