import storeRepository from '../../repositories/store/store.repository.js'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { JWT_SECRET, MP_ACCESS_TOKEN } from '../../config/env.js'
import axios from 'axios'

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

			// ✅ OK — retornar apenas dados públicos
			res.json({
				success: true,
				data: {
					id: store.id,
					name: store.name,
					slug: store.slug,
					image: store.image,
					is_open: true,
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
}

export default new StoreController()
