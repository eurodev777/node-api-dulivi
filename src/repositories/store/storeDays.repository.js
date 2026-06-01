import { getTursoClient } from '../../lib/turso.js'

const turso = getTursoClient()

class StoryDayRepository {
	// Criar categoria
	async create(storyDaysData) {
		const { weekday, is_open, fk_store_id } = storyDaysData
		try {
			const result = await turso.execute(
				`INSERT INTO store_days (weekday, is_open, fk_store_id) 
         VALUES (?, ?, ?) RETURNING *`,
				[weekday, is_open, fk_store_id],
			)
			//Retorno
			return result.rows[0]
		} catch (error) {
			console.error('Não foi possível cadastrar o registro', error)
			throw error
		}
	}
	// Upsert
	async upsert(fk_store_id, storeDayData) {
		const { weekday, is_open } = storeDayData
		try {
			const result = await turso.execute(
				`INSERT INTO store_days (weekday, is_open, fk_store_id)
         VALUES (?, ?, ?)
         ON CONFLICT(weekday, fk_store_id)
         DO UPDATE SET is_open = excluded.is_open
         RETURNING *;`,
				[weekday, is_open, fk_store_id],
			)
			return result.rows?.[0] ?? null
		} catch (error) {
			console.error('Erro ao realizar upsert:', error)
			throw error
		}
	}
	// Encontrar todas categorias
	async getAll(fk_store_id) {
		try {
			const result = await turso.execute(`SELECT * FROM store_days WHERE fk_store_id = ?`, [fk_store_id])
			//Retorno
			return result.rows
		} catch (error) {
			console.error('Registros não encontrados', error)
			throw error
		}
	}
	// Encontrar por ID
	async getById(id) {
		try {
			const result = await turso.execute(`SELECT * FROM store_days WHERE id = ?`, [id])
			return result.rows[0]
		} catch (error) {
			console.error('Registro não encontrado', error)
			throw error
		}
	}
	// Atualizar categoria
	async update(id, storyDaysData) {
		try {
			// Converter chaves do JSON para colunas no banco de dados
			const fields = Object.keys(storyDaysData)
			const values = Object.values(storyDaysData)

			// Construir a query SQL dinâmica
			const setClause = fields.map((field) => `${field} = ?`).join(', ')
			const query = `UPDATE store_days SET ${setClause} WHERE id = ?`

			// Adicionar o ID no final dos valores
			values.push(id)

			const result = await turso.execute(query, values)
			if (result.affectedRows === 0) {
				throw error
			}

			return this.getById(id) // Retorna o registro atualizado
		} catch (error) {
			console.error('Erro ao atualizar registro:', error)
			throw error
		}
	}
	// Deletar categoria
	async delete(id) {
		const result = await turso.execute(`DELETE FROM store_days WHERE id = ?`, [id])
		return result.affectedRows > 0
	}
}

export default new StoryDayRepository()
