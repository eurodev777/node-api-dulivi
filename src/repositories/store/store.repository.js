import { decrypt } from '../../lib/crypto.js'
import { getTursoClient } from '../../lib/turso.js'
import { createSlug } from '../../utils/createSlug.js'

const turso = getTursoClient()

class StoreRepository {
	async create(storeData) {
		const {
			name,
			email,
			password,
			image,
			phone,
			cpf,
			trial_ends_at,
			minimum_order,
			default_delivery_fee,
			delivery_time_min,
			delivery_time_max,
			open_time,
			close_time,
			store_location,
		} = storeData
		const slug = await this.generateUniqueSlug(name)

		try {
			const result = await turso.execute(
				`INSERT INTO stores (
					name,
					email,
					password,
					image,
					phone,
					cpf,
					slug,
					trial_ends_at,
					minimum_order,
					default_delivery_fee,
					delivery_time_min,
					delivery_time_max,
					open_time,
					close_time,
					store_location,
					subscription_status,
					subscription_expires_at,
					free_trial
				) VALUES (
					?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', DATETIME('now', '+15 days'), 1
				) RETURNING *`,
				[
					name,
					email,
					password,
					image || '/assets/image.png',
					phone || null,
					cpf || null,
					slug,
					trial_ends_at,
					minimum_order || 15,
					default_delivery_fee || 5,
					delivery_time_min || 90,
					delivery_time_max || 120,
					open_time || '18:00',
					close_time || '22:00',
					store_location || 'São Paulo, SP',
				],
			)
			return result.rows[0]
		} catch (error) {
			console.error('Não foi possível cadastrar um novo registro: ', error)
			throw error
		}
	}
	// Encontrar por email
	async getByEmail(email) {
		try {
			const result = await turso.execute(`SELECT * FROM stores WHERE email = ?`, [email])
			return result.rows.length ? result.rows[0] : null
		} catch (error) {
			console.error('Registro não encontrado: ', error)
			throw error
		}
	}
	// Encontrar por ID
	async getById(id) {
		try {
			const result = await turso.execute(`SELECT * FROM stores WHERE id = ?`, [id])
			return result.rows.length ? result.rows[0] : null
		} catch (error) {
			console.error('Registro não encontrado: ', error)
			throw error
		}
	}
	// Encontrar por slug
	async getBySlug(slug) {
		try {
			const result = await turso.execute(`SELECT * FROM stores WHERE slug = ?`, [slug])
			return result.rows.length ? result.rows[0] : null
		} catch (error) {
			console.error('Registro não encontrado: ', error)
			throw error
		}
	}
	// Encontrar token
	async getToken(id) {
		try {
			const result = await turso.execute(`SELECT mercadopago_access_token FROM stores WHERE id = ?`, [id])

			const rows = result.rows
			if (!rows || rows.length === 0) {
				return null // ou lance erro, se preferir
			}

			const encryptedToken = rows[0].mercadopago_access_token
			if (!encryptedToken) {
				return null
			}

			const access_token = decrypt(encryptedToken)

			return access_token
		} catch (error) {
			console.error('Erro ao buscar token:', error)
			throw error
		}
	}
	// Atualizar loja
	async update(id, storeData) {
		try {
			if (!storeData || Object.keys(storeData).length === 0) return this.getById(id)
			const lojaAtual = await this.getById(id)
			// Atualiza slug se o nome mudou
			if (storeData?.name && storeData.name !== lojaAtual.name) {
				storeData.slug = await this.generateUniqueSlug(storeData.name)
			}
			// Converter chaves do JSON para colunas no banco de dados
			const fields = Object.keys(storeData)
			const values = Object.values(storeData)
			// Construir a query SQL dinâmica
			const setClause = fields.map((field) => `${field} = ?`).join(', ')
			const query = `UPDATE stores SET ${setClause} WHERE id = ?`
			// Adicionar o ID no final dos valores
			values.push(id)
			// Executar a query no Turso
			await turso.execute(query, values)
			// Retornar o usuário atualizado
			return await this.getById(id)
		} catch (error) {
			throw error
		}
	}
	// Deletar loja
	async delete(id) {
		const result = await turso.execute(`DELETE FROM stores WHERE id = ?`, [id])
		return result.affectedRows > 0
	}
	// Função utilitária para gerar slug único
	async generateUniqueSlug(name) {
		const baseSlug = createSlug(name)
		let slug = baseSlug

		const result = await turso.execute(`SELECT slug FROM stores WHERE slug LIKE ?`, [`${baseSlug}%`])
		const existingSlugs = result.rows.map((r) => r.slug)

		if (existingSlugs.includes(baseSlug)) {
			let counter = 2
			while (existingSlugs.includes(`${baseSlug}-${counter}`)) counter++
			slug = `${baseSlug}-${counter}`
		}

		return slug
	}
}

export default new StoreRepository()
