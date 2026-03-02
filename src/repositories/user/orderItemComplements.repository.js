import { getTursoClient } from '../../lib/turso.js'

const turso = getTursoClient()

class OrderItemsRepository {
	// Criar item do pedido
	async create(orderItemComplementsData) {
		const { quantity, fk_order_item_id, fk_complement_id } = orderItemComplementsData
		try {
			const result = await turso.execute(
				`INSERT INTO order_item_complements (quantity, fk_order_item_id, fk_complement_id)
         VALUES (?, ?, ?) RETURNING *`,
				[Number(quantity), Number(fk_order_item_id), Number(fk_complement_id)],
			)

			return result.rows[0]
		} catch (error) {
			throw error
		}
	}
	// Encontrar todos items do pedido
	async getAll(fk_order_item_id) {
		try {
			const result = await turso.execute(`SELECT * FROM order_item_complements WHERE fk_order_item_id = ?`, [
				fk_order_item_id,
			])
			return result.rows.length ? result.rows : null
		} catch (error) {
			throw error
		}
	}
	// Encontrar item do pedido por ID
	async getById(id) {
		try {
			const result = await turso.execute(`SELECT * FROM order_item_complements WHERE id = ?`, [id])
			return result.rows.length ? result.rows[0] : null
		} catch (error) {
			throw error
		}
	}
	async getByOrderItemId(fk_order_item_id) {
		try {
			const result = await turso.execute(`SELECT * FROM order_item_complements WHERE fk_order_item_id = ?`, [
				fk_order_item_id,
			])
			return result.rows.length ? result.rows : null
		} catch (error) {
			throw error
		}
	}
	// Atualizar item do pedido
	async update(id, orderItemComplementsData) {
		try {
			// Converter chaves do JSON para colunas no banco de dados
			const fields = Object.keys(orderItemComplementsData)
			const values = Object.values(orderItemComplementsData)
			// Construir a query SQL dinâmica
			const setClause = fields.map((field) => `${field} = ?`).join(', ')
			const query = `UPDATE order_item_complements SET ${setClause} WHERE id = ?`
			// Adicionar o ID no final dos valores
			values.push(id)
			// Executar a query no Turso
			await turso.execute(query, values)
			// Retornar o item do pedido atualizado
			return this.getById(id)
		} catch (error) {
			throw error
		}
	}
	// Deletar bairroitem do pedido
	async delete(id) {
		const result = await turso.execute(`DELETE FROM order_item_complements WHERE id = ?`, [id])
		return result.affectedRows > 0
	}
}

export default new OrderItemsRepository()
