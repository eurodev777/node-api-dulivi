import express from 'express'
import axios from 'axios'
import { MP_CLIENT_ID, MP_CLIENT_SECRET } from '../config/env.js'
import { getTursoClient } from '../lib/turso.js'
import { encrypt } from '../lib/crypto.js'

const router = express.Router()
const turso = getTursoClient()

router.get('/auth/mercadopago/callback', async (req, res) => {
	try {
		const { code, state: storeId } = req.query

		if (!code) {
			return res.status(400).json({ error: 'Code não informado' })
		}
		// 2️⃣ Troca o code por token
		const response = await axios.post(
			'https://api.mercadopago.com/oauth/token',
			{
				client_id: MP_CLIENT_ID,
				client_secret: MP_CLIENT_SECRET,
				grant_type: 'authorization_code',
				code,
				redirect_uri: 'https://cardapio-digital-api-nzm1.onrender.com/auth/mercadopago/callback',
			},
			{
				headers: {
					'Content-Type': 'application/json',
				},
			}
		)

		const { access_token, refresh_token, user_id, expires_in } = response.data
		// 3️⃣ Salvar no banco
		await turso.execute(
			`UPDATE stores 
      SET mercadopago_access_token = ?, 
          mercadopago_refresh_token = ?, 
          mercadopago_token_expires_at = ?
      WHERE id = ?`,
			[encrypt(access_token), encrypt(refresh_token), expires_in, storeId]
		)
		// 4️⃣ Redirecionar de volta pro painel
		res.json({
			access_token,
			refresh_token,
			user_id,
			expires_in,
		})
		return res.redirect(`https://painel-dulivi.netlify.app/conta`)
	} catch (err) {
		console.error(err.response?.data || err)
		return res.status(500).json({
			error: 'Erro ao integrar Mercado Pago',
			details: err.response?.data,
		})
	}
})

export default router
