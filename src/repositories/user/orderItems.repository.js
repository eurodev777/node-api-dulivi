import { getTursoClient } from '../../lib/turso.js'

const turso = getTursoClient()

class OrderItemsRepository {
	// Criar item do pedido
	async create(orderItemsData) {
		const { quantity, fk_product_id, fk_order_id } = orderItemsData

		try {
			const result = await turso.execute(
				`INSERT INTO order_items (quantity, fk_product_id, fk_order_id)
         VALUES (?, ?, ?) RETURNING *`,
				[Number(quantity), Number(fk_product_id), Number(fk_order_id)],
			)

			return result.rows[0]
		} catch (error) {
			throw error
		}
	}
	// Encontrar todos items do pedido
	async getAll(fk_order_id) {
		try {
			const result = await turso.execute(`SELECT * FROM order_items WHERE fk_order_id = ?`, [fk_order_id])
			return result.rows.length ? result.rows : null
		} catch (error) {
			throw error
		}
	}
	// Encontrar item do pedido por ID
	async getById(id) {
		try {
			const result = await turso.execute(`SELECT * FROM order_items WHERE id = ?`, [id])
			return result.rows.length ? result.rows[0] : null
		} catch (error) {
			throw error
		}
	}
	// Atualizar item do pedido
	async update(id, orderItemsData) {
		try {
			// Converter chaves do JSON para colunas no banco de dados
			const fields = Object.keys(orderItemsData)
			const values = Object.values(orderItemsData)
			// Construir a query SQL dinâmica
			const setClause = fields.map((field) => `${field} = ?`).join(', ')
			const query = `UPDATE order_items SET ${setClause} WHERE id = ?`
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
		const result = await turso.execute(`DELETE FROM order_items WHERE id = ?`, [id])
		return result.affectedRows > 0
	}
}

export default new OrderItemsRepository()
