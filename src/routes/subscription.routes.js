import express from 'express'
import { getTursoClient } from '../lib/turso.js'
import { asaas } from '../lib/asaas.js'
import { paymentLimiter } from '../middlewares/paymentLimiter.js'

const router = express.Router()
const turso = getTursoClient()

const PLANS = {
	dulivi_plan_start: {
		name: 'dulivi_plan_start',
		price: 89.9,
	},

	dulivi_plan_pro: {
		name: 'dulivi_plan_pro',
		price: 139.9,
	},

	dulivi_plan_turbo: {
		name: 'dulivi_plan_turbo',
		price: 249.9,
	},
}

//ROTA DE ASSINAR
router.post('/api/subscriptions/', paymentLimiter, async (req, res) => {
	try {
		const {
			fk_store_id,
			plan_slug,

			name,
			email,
			cpfCnpj,

			postalCode,
			addressNumber = 123,
			phone,

			card_holder_name,
			card_number,
			card_expiry_month,
			card_expiry_year,
			card_ccv,
		} = req.body
		const nextDueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
		const formattedNextDueDate = nextDueDate.toISOString().slice(0, 10)
		const plan = PLANS[plan_slug]

		if (!plan) {
			return res.status(400).json({
				error: 'Plano inválido',
			})
		}

		// 2️⃣ Criar customer
		const customerResponse = await asaas.post('/customers', {
			name,
			email,
			cpfCnpj,
		})

		const customer = customerResponse.data

		// 3️⃣ Criar assinatura
		const subscriptionResponse = await asaas.post('/subscriptions', {
			customer: customer.id,

			billingType: 'CREDIT_CARD',

			value: plan.price,

			nextDueDate: formattedNextDueDate,

			cycle: 'MONTHLY',

			description: plan.name,

			creditCard: {
				holderName: card_holder_name,
				number: card_number,
				expiryMonth: card_expiry_month,
				expiryYear: card_expiry_year,
				ccv: card_ccv,
			},

			creditCardHolderInfo: {
				name,
				email,
				cpfCnpj,
				postalCode,
				addressNumber,
				phone,
			},
		})

		const subscription = subscriptionResponse.data

		// 4️⃣ Salvar no banco
		await turso.execute(
			`
			UPDATE stores
			SET
				asaas_customer_id = ?,
				subscription_id = ?,
				subscription_status = ?,
				plan = ?,
				last_four_digits = ?
			WHERE id = ?
			`,
			[customer.id, subscription.id, subscription.status, plan_slug, card_number.slice(-4), fk_store_id],
		)

		return res.json(subscription)
	} catch (err) {
		console.error(err.response?.data || err)

		return res.status(500).json({
			error: 'Erro ao criar assinatura',
			details: err.response?.data,
		})
	}
})
// CONSULTAR ASSINATURA
router.get('/api/subscriptions/:fk_store_id', paymentLimiter, async (req, res) => {
	try {
		const { fk_store_id } = req.params

		const store = await turso.execute(`SELECT subscription_id FROM stores WHERE id = ?`, [fk_store_id])

		if (!store.rows.length) {
			return res.status(404).json({
				error: 'Assinatura não encontrada',
			})
		}

		const subscriptionId = store.rows[0].subscription_id

		const response = await asaas.get(`/subscriptions/${subscriptionId}`)

		return res.json(response.data)
	} catch (err) {
		return res.status(500).json(
			err.response?.data || {
				error: 'Erro ao buscar assinatura',
			},
		)
	}
})
// VERIFICAR PAGAMENTOS DA ASSINATURA
router.get('/api/subscriptions/:fk_store_id/payments', paymentLimiter, async (req, res) => {
	try {
		const { fk_store_id } = req.params

		const store = await turso.execute(`SELECT subscription_id FROM stores WHERE id = ?`, [fk_store_id])

		if (!store.rows.length) {
			return res.status(404).json({
				error: 'Assinatura não encontrada',
			})
		}

		const subscriptionId = store.rows[0].subscription_id

		const response = await asaas.get('/payments', {
			params: {
				subscription: subscriptionId,
			},
		})

		return res.json(response.data)
	} catch (err) {
		return res.status(500).json(err.response?.data || err)
	}
})
// ALTERAR PLANO
router.post('/api/subscriptions/:fk_store_id', paymentLimiter, async (req, res) => {
	try {
		const { fk_store_id } = req.params
		const { new_plan_slug } = req.body

		const store = await turso.execute(`SELECT subscription_id FROM stores WHERE id = ?`, [fk_store_id])

		if (!store.rows.length) {
			return res.status(404).json({
				error: 'Assinatura não encontrada',
			})
		}

		const subscriptionId = store.rows[0].subscription_id

		const plan = PLANS[new_plan_slug]

		if (!plan) {
			return res.status(400).json({
				error: 'Plano inválido',
			})
		}

		const response = await asaas.post(`/subscriptions/${subscriptionId}`, {
			value: plan.price,
			description: plan.name,
		})

		await turso.execute(
			`
			UPDATE stores
			SET plan = ?
			WHERE id = ?
			`,
			[new_plan_slug, fk_store_id],
		)

		return res.json(response.data)
	} catch (err) {
		return res.status(500).json(err.response?.data || err)
	}
})
// CANCELAR ASSINATURA
router.delete('/api/subscriptions/:fk_store_id', paymentLimiter, async (req, res) => {
	try {
		const { fk_store_id } = req.params

		const store = await turso.execute(`SELECT subscription_id FROM stores WHERE id = ?`, [fk_store_id])

		if (!store.rows.length) {
			return res.status(404).json({
				error: 'Assinatura não encontrada',
			})
		}

		const subscriptionId = store.rows[0].subscription_id

		await asaas.delete(`/subscriptions/${subscriptionId}`)

		await turso.execute(
			`
			UPDATE stores
			SET
				subscription_status = 'cancelled',
				subscription_id = NULL
			WHERE id = ?
			`,
			[fk_store_id],
		)

		return res.json({
			success: true,
		})
	} catch (err) {
		return res.status(500).json(err.response?.data || err)
	}
})

export default router
