import storeRepository from '../../repositories/store/store.repository.js'
import storyDayRepository from '../../repositories/store/storeDays.repository.js'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { JWT_SECRET } from '../../config/env.js'
import { getTursoClient } from '../../lib/turso.js'
import { asaas } from '../../lib/asaas.js'

const turso = getTursoClient()

const SECRET = JWT_SECRET

class StoreController {
	// Cadastrar nova loja
	async create(req, res) {
		const { name, email, password, phone = null, cpf = null } = req.body

		const hashedPassword = await bcrypt.hash(password, 10)

		const TRIAL_DAYS = 15
		const trialEndsAt = Math.floor(Date.now() + TRIAL_DAYS * 86400000)

		try {
			const newStore = await storeRepository.create({
				name,
				email,
				password: hashedPassword,
				phone,
				cpf,
				trial_ends_at: trialEndsAt,
			})

			// Cria os 7 dias da semana abertos por padrão
			await Promise.all(
				Array.from({ length: 7 }, (_, weekday) =>
					storyDayRepository.upsert(newStore.id, {
						weekday,
						is_open: 1,
					}),
				),
			)

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

			delete store.password
			delete store.cpf
			delete store.email
			delete store.asaas_access_token
			delete store.subscription_id
			delete store.subscription_expires_at
			delete store.subscription_status
			delete store.asaas_customer_id
			delete store.last_four_digits

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
			delete updateStore?.asaas_access_token

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
		try {
			const { slug } = req.params

			// Buscar loja
			const store = await storeRepository.getBySlug(slug)

			if (!store) {
				return res.status(404).json({
					success: false,
					error: 'STORE_NOT_FOUND',
				})
			}

			const now = Date.now()
			const freeTrial = Number(store.free_trial) === 1
			const trialEndsAt = Number(store.trial_ends_at)

			const trialActive = freeTrial && trialEndsAt && now < trialEndsAt

			// Se não tiver trial ativo e não tiver assinatura
			if (!trialActive && !store.subscription_id) {
				return res.status(403).json({
					success: false,
					error: 'STORE_INACTIVE',
				})
			}

			// Validar assinatura apenas se não estiver em trial
			if (!trialActive) {
				try {
					const response = await asaas.get(`/subscriptions/${store.subscription_id}`)

					if (
						response.data.deleted ||
						(response.data.status !== 'ACTIVE' && response.data.status !== 'AUTHORIZATION_PENDING')
					) {
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
			}

			delete store.password
			delete store.cpf
			delete store.email
			delete store.subscription_id
			delete store.subscription_expires_at
			delete store.subscription_status
			delete store.asaas_customer_id
			delete store.last_four_digits

			return res.json({
				success: true,
				data: store,
			})
		} catch (err) {
			console.error(err)

			return res.status(500).json({
				success: false,
				error: 'INTERNAL_ERROR',
			})
		}
	}
	// Buscar status da loja
	async getStoreStatus(req, res) {
		try {
			const { fk_store_id } = req.params

			const result = await turso.execute(
				`SELECT subscription_id, free_trial, trial_ends_at, is_closed 
			 FROM stores 
			 WHERE id = ?`,
				[fk_store_id],
			)

			if (!result.rows.length) {
				return res.status(404).json({ error: 'Loja não encontrada' })
			}

			const store = result.rows[0]

			const freeTrial = Number(store.free_trial) === 1
			const trialEndsAt = Number(store.trial_ends_at)
			const now = Date.now()

			const diffMs = trialEndsAt - now
			const diffDays = Math.ceil(diffMs / 86400000)

			/**
			 * 1️⃣ FREE TRIAL
			 */
			if (freeTrial && trialEndsAt) {
				if (now < trialEndsAt) {
					if (Number(store.is_closed) === 1) {
						await turso.execute(`UPDATE stores SET is_closed = 0 WHERE id = ?`, [fk_store_id])
					}

					return res.json({ active: true, reason: 'trial', trial: `Faltam ${diffDays} dias` })
				}

				// trial expirou
				await turso.execute(`UPDATE stores SET free_trial = 0, is_closed = 1 WHERE id = ?`, [fk_store_id])

				return res.json({ active: false, reason: 'trial_expired' })
			}

			/**
			 * 2️⃣ ASSINATURA
			 */
			if (store.subscription_id) {
				const response = await asaas.get(`/subscriptions/${store.subscription_id}`)

				const subscription = response.data

				if (
					subscription.deleted === false &&
					(subscription.status === 'ACTIVE' || subscription.status === 'AUTHORIZATION_PENDING')
				) {
					if (Number(store.is_closed) === 1) {
						await turso.execute(`UPDATE stores SET is_closed = 0 WHERE id = ?`, [fk_store_id])
					}

					return res.json({ active: true, reason: 'subscription' })
				}

				await turso.execute(`UPDATE stores SET is_closed = 1 WHERE id = ?`, [fk_store_id])

				return res.json({ active: false, reason: subscription?.status })
			}

			/**
			 * 3️⃣ SEM TRIAL E SEM ASSINATURA
			 */
			await turso.execute(`UPDATE stores SET is_closed = 1 WHERE id = ?`, [fk_store_id])

			return res.json({ active: false, reason: 'no_subscription' })
		} catch (err) {
			console.error('Erro ao verificar status da loja:', err.response?.data || err)
			return res.status(500).json({ error: 'Erro ao verificar status da loja' })
		}
	}
	// Verificar status do Asaas
	async checkMercadoPagoStatus(req, res) {
		try {
			const { fk_store_id } = req.params

			// 1️⃣ Buscar dados da loja
			const result = await turso.execute(
				`SELECT id, is_closed, asaas_access_token 
       FROM stores 
       WHERE id = ?`,
				[fk_store_id],
			)

			if (!result.rows.length) {
				return res.status(404).json({ error: 'Loja não encontrada' })
			}

			const store = result.rows[0]
			const hasToken = !!store.asaas_access_token

			// // 2️⃣ Abrir ou fechar automaticamente
			// if (hasToken && store.is_closed) {
			// 	await turso.execute(`UPDATE stores SET is_closed = 0 WHERE id = ?`, [fk_store_id])
			// }

			// if (!hasToken && !store.is_closed) {
			// 	await turso.execute(`UPDATE stores SET is_closed = 1 WHERE id = ?`, [fk_store_id])
			// }

			// 3️⃣ Resposta limpa pro frontend
			return res.json({
				hasToken,
				is_closed: hasToken ? 0 : 1,
				showWarning: !hasToken,
			})
		} catch (err) {
			console.error('Erro ao checar Asaas:', err)
			return res.status(500).json({ error: 'Erro ao verificar status do Asaas' })
		}
	}
}

export default new StoreController()
