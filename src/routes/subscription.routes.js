import axios from 'axios'
import express from 'express'
import { getTursoClient } from '../lib/turso.js'
import { MP_ACCESS_TOKEN } from '../config/env.js'

const router = express.Router()
const turso = getTursoClient()

router.post('/subscriptions/subscribe', async (req, res) => {
	try {
		const { fk_store_id, plan_slug, payer_email, card_token_id, last_four_digits } = req.body
		// 0️⃣ Buscar store
		const storeRes = await turso.execute(`SELECT first_subscription_at FROM stores WHERE id = ?`, [fk_store_id])

		if (!storeRes.rows.length) {
			return res.status(404).json({ error: 'Loja não encontrada' })
		}

		const store = storeRes.rows[0]
		const isFirstSubscription = !store.first_subscription_at
		// 1️⃣ Buscar plano
		const plan = await turso.execute(`SELECT mp_plan_id, price FROM plans WHERE slug = ?`, [plan_slug])

		if (!plan.rows.length) {
			return res.status(400).json({ error: 'Plano inválido' })
		}
		// 2️⃣ Config auto_recurring
		const autoRecurring = {
			//transaction_amount: plan.rows[0].price,
			transaction_amount: 1,
			currency_id: 'BRL',
		}

		if (isFirstSubscription) {
			autoRecurring.free_trial = {
				frequency: 15,
				frequency_type: 'days',
			}
		}
		// 3️⃣ Criar assinatura
		const response = await axios.post(
			'https://api.mercadopago.com/preapproval',
			{
				preapproval_plan_id: plan.rows[0].mp_plan_id,
				payer_email,
				card_token_id,
				external_reference: `store_${fk_store_id}`,
				auto_recurring: autoRecurring,
			},
			{
				headers: {
					Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
					'Content-Type': 'application/json',
				},
			},
		)
		// 4️⃣ Atualizar store
		const updateQuery = isFirstSubscription
			? `
    UPDATE stores
    SET subscription_id = ?,
        subscription_status = ?,
        plan = ?,
        last_four_digits = ?,
        first_subscription_at = ?
    WHERE id = ?`
			: `
    UPDATE stores
    SET subscription_id = ?,
        subscription_status = ?,
        plan = ?,
        last_four_digits = ?
    WHERE id = ?`

		const updateFields = isFirstSubscription
			? [response.data.id, response.data.status, plan_slug, last_four_digits, Date.now(), fk_store_id]
			: [response.data.id, response.data.status, plan_slug, last_four_digits, fk_store_id]

		await turso.execute(updateQuery, updateFields)

		res.json(response.data)
	} catch (err) {
		console.error(err.response?.data || err)
		res.status(500).json(err.response?.data || { error: 'Erro ao criar assinatura' })
	}
})
router.get('/subscriptions/:fk_store_id', async (req, res) => {
	try {
		const { fk_store_id } = req.params
		// 1️⃣ Buscar subscription_id no seu banco
		const result = await turso.execute(
			`SELECT subscription_id, subscription_status, plan 
       FROM stores WHERE id = ?`,
			[fk_store_id],
		)

		if (!result.rows.length || !result.rows[0].subscription_id) {
			return res.status(404).json({ error: 'Assinatura não encontrada' })
		}

		const subscriptionId = result.rows[0].subscription_id
		// 2️⃣ Consultar Mercado Pago (TOKEN DA PLATAFORMA)
		const response = await axios.get(`https://api.mercadopago.com/preapproval/${subscriptionId}`, {
			headers: {
				Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
				'Content-Type': 'application/json',
			},
		})

		res.json(response.data)
	} catch (err) {
		console.error(err.response?.data || err)
		res.status(500).json(err.response?.data || { error: 'Erro ao consultar assinatura' })
	}
})
router.put('/subscriptions/:fk_store_id/pause', async (req, res) => {
	try {
		const { fk_store_id } = req.params
		// 1️⃣ Buscar subscription_id no seu banco
		const result = await turso.execute(
			`SELECT subscription_id, subscription_status, plan 
       FROM stores WHERE id = ?`,
			[fk_store_id],
		)
		if (!result.rows.length || !result.rows[0].subscription_id) {
			return res.status(404).json({ error: 'Assinatura não encontrada' })
		}
		const subscriptionId = result.rows[0].subscription_id

		const response = await axios.put(
			`https://api.mercadopago.com/preapproval/${subscriptionId}`,
			{ status: 'paused' },
			{
				headers: {
					Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
					'Content-Type': 'application/json',
				},
			},
		)

		await turso.execute(`UPDATE stores SET subscription_status = 'paused' WHERE subscription_id = ?`, [
			subscriptionId,
		])

		res.json(response.data)
	} catch (err) {
		res.status(500).json(err.response?.data || err)
	}
})
router.put('/subscriptions/:fk_store_id/reactivate', async (req, res) => {
	try {
		const { fk_store_id } = req.params
		// 1️⃣ Buscar subscription_id no seu banco
		const result = await turso.execute(
			`SELECT subscription_id, subscription_status, plan 
       FROM stores WHERE id = ?`,
			[fk_store_id],
		)
		if (!result.rows.length || !result.rows[0].subscription_id) {
			return res.status(404).json({ error: 'Assinatura não encontrada' })
		}
		const subscriptionId = result.rows[0].subscription_id

		const response = await axios.put(
			`https://api.mercadopago.com/preapproval/${subscriptionId}`,
			{ status: 'authorized' },
			{
				headers: {
					Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
					'Content-Type': 'application/json',
				},
			},
		)

		await turso.execute(`UPDATE stores SET subscription_status = 'authorized' WHERE subscription_id = ?`, [
			subscriptionId,
		])

		res.json(response.data)
	} catch (err) {
		res.status(500).json(err.response?.data || err)
	}
})
router.put('/subscriptions/:fk_store_id/change-card', async (req, res) => {
	try {
		const { fk_store_id } = req.params
		const { card_token_id, last_four_digits } = req.body

		if (!card_token_id) {
			return res.status(400).json({ error: 'card_token_id é obrigatório' })
		}

		const store = await turso.execute(
			`SELECT subscription_id, subscription_status, plan 
       FROM stores WHERE id = ?`,
			[fk_store_id],
		)
		if (!store.rows.length || !store.rows[0].subscription_id) {
			return res.status(404).json({ error: 'Assinatura não encontrada' })
		}
		const subscriptionId = store.rows[0].subscription_id

		const response = await axios.put(
			`https://api.mercadopago.com/preapproval/${subscriptionId}`,
			{
				card_token_id: card_token_id,
			},
			{
				headers: {
					Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
					'Content-Type': 'application/json',
				},
			},
		)

		await turso.execute(`UPDATE stores SET last_four_digits = ? WHERE id = ?`, [last_four_digits, fk_store_id])

		res.json({
			success: true,
			payment_method: response.data.payment_method_id,
			card_id: response.data.card_id,
		})
	} catch (err) {
		res.status(500).json(err.response?.data || err)
	}
})
router.put('/subscriptions/:fk_store_id/cancel', async (req, res) => {
	try {
		const { fk_store_id } = req.params

		const store = await turso.execute(
			`SELECT subscription_id, subscription_status, plan 
       FROM stores WHERE id = ?`,
			[fk_store_id],
		)
		if (!store.rows.length || !store.rows[0].subscription_id) {
			return res.status(404).json({ error: 'Assinatura não encontrada' })
		}
		const subscriptionId = store.rows[0].subscription_id

		const response = await axios.put(
			`https://api.mercadopago.com/preapproval/${subscriptionId}`,
			{ status: 'cancelled' },
			{
				headers: {
					Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
					'Content-Type': 'application/json',
				},
			},
		)

		// Atualiza seu banco
		await turso.execute(`UPDATE stores SET subscription_status = 'cancelled' WHERE subscription_id = ?`, [
			subscriptionId,
		])

		res.json({ success: true, status: response.data.status })
	} catch (err) {
		res.status(500).json(err.response?.data || err)
	}
})
router.put('/subscriptions/:fk_store_id/change-plan', async (req, res) => {
	try {
		const { fk_store_id } = req.params
		const { new_plan_slug } = req.body

		if (!fk_store_id || !new_plan_slug) {
			return res.status(400).json({ error: 'Dados obrigatórios ausentes' })
		}
		// 1️⃣ Buscar loja e assinatura atual
		const store = await turso.execute(`SELECT subscription_id, plan FROM stores WHERE id = ?`, [fk_store_id])
		if (!store.rows.length || !store.rows[0].subscription_id) {
			return res.status(400).json({ error: 'Assinatura não encontrada' })
		}
		const subscriptionId = store.rows[0].subscription_id
		// 2️⃣ Buscar novo plano
		const plan = await turso.execute(`SELECT price, name FROM plans WHERE slug = ?`, [new_plan_slug])

		if (!plan.rows.length) {
			return res.status(400).json({ error: 'Plano inválido' })
		}

		// 3️⃣ Atualizar assinatura no Mercado Pago
		const response = await axios.put(
			`https://api.mercadopago.com/preapproval/${subscriptionId}`,
			{
				reason: `Plano ${plan.rows[0].name} - Dulivi Cardápio Digital`,
				auto_recurring: {
					transaction_amount: plan.rows[0].price,
					currency_id: 'BRL',
				},
			},
			{
				headers: {
					Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
					'Content-Type': 'application/json',
				},
			},
		)

		// 4️⃣ Atualizar banco
		await turso.execute(
			`UPDATE stores 
       SET plan = ?, subscription_status = ?
       WHERE id = ?`,
			[new_plan_slug, response.data.status, fk_store_id],
		)

		return res.json({
			success: true,
			message: 'Plano alterado com sucesso',
			subscription: response.data,
		})
	} catch (err) {
		console.error(err.response?.data || err)

		return res.status(500).json({
			error: 'Erro ao trocar plano',
			details: err.response?.data,
		})
	}
})

export default router
