import storeRepository from '../../repositories/store/store.repository.js'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { timestampToDate } from '../../utils/date.js'
import { JWT_SECRET, MP_ACCESS_TOKEN } from '../../config/env.js'
import axios from 'axios'
import { getTursoClient } from '../../lib/turso.js'

const turso = getTursoClient()

const SECRET = JWT_SECRET
const mpAccessToken = MP_ACCESS_TOKEN

class StoreController {
	// Cadastrar nova loja
	async create(req, res) {
		const { name, email, password, phone = null, cpf = null } = req.body

		const hashedPassword = await bcrypt.hash(password, 10)

		try {
			const newStore = await storeRepository.create({
				name,
				email,
				password: hashedPassword,
				phone,
				cpf,
			})
			//Retorno da API
			res.status(200).json({
				success: true,
				message: 'Registro criado com sucesso',
				data: newStore,
			})
			//Tratamento de erros
		} catch (error) {
			console.error('Erro ao criar registro: ', error)
			res.status(500).json({ success: false, error: 'Erro ao criar registro' })
		}
	}
	//Login da loja
	async login(req, res) {
		const { email, password } = req.body
		try {
			const store = await storeRepository.getByEmail(email)

			if (!store) {
				return res.status(404).json({ success: false, error: 'Credenciais inválidas!' })
			}

			const passwordMatches = await bcrypt.compare(password.trim(), store.password)

			if (!passwordMatches) {
				return res.status(401).json({ success: false, error: 'Credenciais inválidas' })
			}

			const token = jwt.sign({ id: store.id, email: store.email }, SECRET, {
				expiresIn: '30d',
			})
			//Retorno da API
			res.status(200).json({
				success: true,
				data: {
					id: store.id,
					token,
				},
				message: 'Login verificado com sucesso',
			})
			//Tratamento de erros
		} catch (error) {
			console.error('Erro ao verificar login: ', error)
			res.status(500).json({
				success: false,
				message: 'Erro ao verificar login',
				error: process.env.NODE_ENV === 'development' ? error : undefined,
			})
		}
	}
	//Buscar por ID
	async getById(req, res) {
		const id = req.params.id

		try {
			const store = await storeRepository.getById(id)

			if (!store || store.length === 0) {
				return res.status(404).json({
					success: false,
					error: 'ID não encontrado',
				})
			}
			//Retorno da API
			res.status(200).json({
				success: true,
				message: 'Registro encontrado com sucesso!',
				data: store,
			})
			//Tratamento de erros
		} catch (error) {
			console.error('Erro ao buscar registro:', error)
			res.status(500).json({
				success: false,
				message: 'Erro ao buscar registro',
				error: process.env.NODE_ENV === 'development' ? error : undefined,
			})
		}
	}
	//Buscar por slug
	async getBySlug(req, res) {
		const slug = req.params.slug

		try {
			const store = await storeRepository.getBySlug(slug)

			if (!store || store.length === 0) {
				return res.status(404).json({
					success: false,
					error: 'Slug não encontrado',
				})
			}
			//Retorno da API
			res.status(200).json({
				success: true,
				message: 'Registro encontrado com sucesso!',
				data: store,
			})
			//Tratamento de erros
		} catch (error) {
			console.error('Erro ao buscar registro:', error)
			res.status(500).json({
				success: false,
				message: 'Erro ao buscar registro',
				error: process.env.NODE_ENV === 'development' ? error : undefined,
			})
		}
	}
	// Atualizar loja
	async update(req, res) {
		const id = req.params.id
		const { data } = req.body

		const existingStore = await storeRepository.getById(id)

		if (!existingStore) {
			return res.status(404).json({ success: false, error: 'ID não encontrado' })
		}

		try {
			if (data.password) {
				data.password = await bcrypt.hash(data.password, 10)
			}

			const updateStore = await storeRepository.update(id, data)

			// Remove dados sensíveis antes de enviar ao cliente
			delete updateStore?.password
			delete updateStore?.mercadopago_access_token

			res.status(200).json({
				success: true,
				message: 'Registro atualizado com sucesso',
				data: updateStore,
			})
		} catch (error) {
			console.error('Erro ao atualizar registro:', error)
			res.status(500).json({
				success: false,
				message: 'Erro ao atualizar registro',
				error: process.env.NODE_ENV === 'development' ? error : undefined,
			})
		}
	}
	// Buscar loja por slug (público)
	async getPublicBySlug(req, res) {
		const { slug } = req.params

		try {
			// 1️⃣ Buscar loja
			const store = await storeRepository.getBySlug(slug)

			if (!store) {
				return res.status(404).json({
					success: false,
					error: 'STORE_NOT_FOUND',
				})
			}

			// 2️⃣ Validar config Mercado Pago
			if (!store.subscription_id) {
				return res.status(403).json({
					success: false,
					error: 'STORE_INACTIVE',
				})
			}

			// 3️⃣ Validar assinatura no Mercado Pago
			try {
				const response = await axios.get(`https://api.mercadopago.com/preapproval/${store.subscription_id}`, {
					headers: {
						Authorization: `Bearer ${mpAccessToken}`,
					},
				})

				if (response.data.status !== 'authorized') {
					return res.status(403).json({
						success: false,
						error: 'STORE_INACTIVE',
					})
				}
			} catch {
				return res.status(403).json({
					success: false,
					error: 'STORE_INACTIVE',
				})
			}

			delete store.password
			delete store.mercadopago_access_token
			delete store.mercadopago_refresh_token
			delete store.mercadopago_token_expires_at
			delete store.subscription_id
			delete store.subscription_expires_at
			delete store.subscription_status

			// ✅ OK — retornar apenas dados públicos
			res.json({
				success: true,
				data: {
					...store,
				},
			})
		} catch (err) {
			console.error(err)
			res.status(500).json({
				success: false,
				error: 'INTERNAL_ERROR',
			})
		}
	}
	// Buscar status da loja
	async getStoreStatus(req, res) {
		const TRIAL_DAYS = 15
		const mpAccessToken = MP_ACCESS_TOKEN

		try {
			const { fk_store_id } = req.params

			const result = await turso.execute(
				`SELECT first_subscription_at, subscription_id FROM stores WHERE id = ?`,
				[fk_store_id],
			)

			if (!result.rows.length) {
				return res.status(404).json({ error: 'Loja não encontrada' })
			}

			const store = result.rows[0]

			/**
			 * 1️⃣ SE TEM ASSINATURA → MERCADO PAGO MANDA
			 */
			if (store.subscription_id) {
				const response = await axios.get(`https://api.mercadopago.com/preapproval/${store.subscription_id}`, {
					headers: {
						Authorization: `Bearer ${mpAccessToken}`,
						'Content-Type': 'application/json',
					},
				})

				const subscription = response.data

				if (subscription.status === 'authorized') {
					await turso.execute(`UPDATE stores SET is_closed = 0 WHERE id = ?`, [fk_store_id])
					return res.json({ active: true, reason: 'subscription' })
				}

				// cancelada, paused, etc
				await turso.execute(`UPDATE stores SET is_closed = 1 WHERE id = ?`, [fk_store_id])
				return res.json({ active: false, reason: subscription.status })
			}

			/**
			 * 2️⃣ SEM ASSINATURA → VERIFICA TRIAL
			 */
			const firstDate = timestampToDate(store.first_subscription_at)

			if (firstDate) {
				const now = new Date()
				const trialEnd = new Date(firstDate.getTime() + TRIAL_DAYS * 86400000)

				if (now < trialEnd) {
					await turso.execute(`UPDATE stores SET is_closed = 0 WHERE id = ?`, [fk_store_id])
					return res.json({ active: true, reason: 'trial' })
				}
			}

			/**
			 * 3️⃣ SEM ASSINATURA E SEM TRIAL
			 */
			await turso.execute(`UPDATE stores SET is_closed = 1 WHERE id = ?`, [fk_store_id])
			return res.json({ active: false, reason: 'no_subscription' })
		} catch (err) {
			console.error('Erro ao verificar status da loja:', err.response?.data || err)
			return res.status(500).json({ error: 'Erro ao verificar status da loja' })
		}
	}

	// Verificar status do Mercado Pago
	async checkMercadoPagoStatus(req, res) {
		try {
			const { fk_store_id } = req.params

			// 1️⃣ Buscar dados da loja
			const result = await turso.execute(
				`SELECT id, is_closed, mercadopago_access_token 
       FROM stores 
       WHERE id = ?`,
				[fk_store_id],
			)

			if (!result.rows.length) {
				return res.status(404).json({ error: 'Loja não encontrada' })
			}

			const store = result.rows[0]
			const hasToken = !!store.mercadopago_access_token

			// 2️⃣ Abrir ou fechar automaticamente
			if (hasToken && store.is_closed) {
				await turso.execute(`UPDATE stores SET is_closed = 0 WHERE id = ?`, [fk_store_id])
			}

			if (!hasToken && !store.is_closed) {
				await turso.execute(`UPDATE stores SET is_closed = 1 WHERE id = ?`, [fk_store_id])
			}

			// 3️⃣ Resposta limpa pro frontend
			return res.json({
				hasToken,
				is_closed: hasToken ? 0 : 1,
				showWarning: !hasToken,
			})
		} catch (err) {
			console.error('Erro ao checar Mercado Pago:', err)
			return res.status(500).json({ error: 'Erro ao verificar status do Mercado Pago' })
		}
	}
}

export default new StoreController()
