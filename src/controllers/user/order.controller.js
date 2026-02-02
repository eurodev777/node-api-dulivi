import orderRepository from '../../repositories/user/order.repository.js'
import orderItemsRepository from '../../repositories/user/orderItems.repository.js'
import orderItemComplementsRepository from '../../repositories/user/orderItemComplements.repository.js'
import userRepository from '../../repositories/user/user.repository.js'
import productRepository from '../../repositories/store/product.repository.js'
import complementRepository from '../../repositories/store/complement.repository.js'
import validateProductPrice from '../../utils/validateProductPrice.js'
import validateComplementPrice from '../../utils/validateComplementPrice.js'
import checkPaymentStatus from '../../utils/checkPaymentStatus.js'
import { calculateTotalOrderValue } from '../../utils/calculateTotalOrderValue.js'
import logTamperedTotal from '../../utils/logTamperedTotal.js'
import parseValidId from '../../utils/parseValidId.js'

class OrderController {
	// Criar um novo pedido com itens
	async create(req, res) {
		const {
			total_amount,
			delivery_method = 'entrega',
			is_scheduled = 0,
			scheduled_for,
			delivery_address,
			payment_method,
			customer_name = null,
			customer_whatsapp = null,
			observation = null,
			paid = 0,
			status = 'confirmado',
			mercadopago_pay_id = null,
			created_at,
			fk_store_delivery_areas_id,
			fk_delivery_address_id = null,
			fk_user_id = null,
			fk_store_id,
		} = req.body
		const items = req.body.items

		try {
			// 1. Criar pedido
			const newOrder = await orderRepository.create({
				total_amount,
				delivery_method,
				is_scheduled,
				scheduled_for,
				delivery_address,
				payment_method,
				customer_name,
				customer_whatsapp,
				observation,
				paid,
				status,
				mercadopago_pay_id,
				created_at,
				fk_store_delivery_areas_id,
				fk_delivery_address_id,
				fk_user_id,
				fk_store_id,
			})

			const orderId = newOrder.id
			// 2. Criar itens do pedido
			const createdItems = []

			// 2. Criar itens do pedido e seus complementos
			for (const item of items) {
				const newItem = await orderItemsRepository.create({
					quantity: item.quantity,
					price_unit: item.price_unit,
					fk_product_id: item.fk_product_id,
					fk_order_id: orderId,
				})

				// Se houver complementos no item, salvar também
				if (Array.isArray(item.complements)) {
					for (const complement of item.complements) {
						await orderItemComplementsRepository.create({
							quantity: complement.quantity || 1,
							fk_order_item_id: newItem.id,
							fk_complement_id: complement.fk_complement_id,
						})
					}
				}

				createdItems.push(newItem)
			}
			// 3. Retornar pedido + itens
			res.status(201).json({
				success: true,
				message: 'Pedido criado com sucesso',
				data: {
					order: newOrder,
					items: createdItems,
				},
			})
		} catch (error) {
			console.error('Erro ao criar pedido: ', error)
			res.status(500).json({ success: false, error: 'Erro ao criar pedido' })
		}
	}
	// Buscar todos os pedidos com seus respectivos itens
	async getAll(req, res) {
		const fk_store_id = Number(req.query.fk_store_id)

		try {
			const orders = await orderRepository.getAll(fk_store_id)

			if (!orders || orders.length === 0) {
				return res.status(404).json({
					success: false,
					error: 'Nenhuma produto encontrado para esta loja',
				})
			}

			const serialized = await Promise.all(
				orders.map(async (order) => {
					let customerName = order.customer_name
					let customerWhatsapp = order.customer_whatsapp
					// Se tiver user_id, busca os dados do usuário
					if (order.fk_user_id) {
						const user = await userRepository.getById(order.fk_user_id)
						if (user) {
							customerName = user.name || customerName
							customerWhatsapp = user.whatsapp || customerWhatsapp
						}
					}

					return {
						id: order.id,
						customer_name: customerName,
						total_amount: order.total_amount,
						delivery_method: order.delivery_method,
						is_scheduled: order?.is_scheduled,
						scheduled_for: order?.scheduled_for,
						payment_method: order.payment_method,
						paid: order?.paid || false,
						status: order.status,
						created_at: order.created_at,
					}
				}),
			)

			res.status(200).json({
				success: true,
				message: 'Pedidos encontrados com sucesso',
				data: serialized,
			})
		} catch (error) {
			console.error('Erro ao buscar pedidos:', error)
			res.status(500).json({ success: false, error: 'Erro ao buscar pedidos' })
		}
	}
	//Buscar pedido por ID
	async getById(req, res) {
		const id = Number(req.params.id)

		try {
			const order = await orderRepository.getById(id)

			if (!order) {
				return res.status(404).json({
					success: false,
					error: 'Nenhum registro encontrado para este ID',
				})
			}

			let customerName = order.customer_name
			let customerWhatsapp = order.customer_whatsapp

			// Se tiver user_id, busca os dados do usuário
			const userId = parseValidId(order.fk_user_id)
			if (userId) {
				const user = await userRepository.getById(userId)
				if (user) {
					customerName = user.name || customerName
					customerWhatsapp = user.whatsapp || customerWhatsapp
				}
			}
			// Listar produtos do pedido
			const orderItems = (await orderItemsRepository.getAll(order.id)) || []
			const itemsWithDetails = await Promise.all(
				orderItems.map(async (item) => {
					const product = await productRepository.getById(item.fk_product_id)

					// Buscar complementos do item
					const rawComplements = (await orderItemComplementsRepository.getByOrderItemId(item.id)) || []

					const formattedComplements = await Promise.all(
						rawComplements.map(async (c) => {
							const comp = await complementRepository.getById(c.fk_complement_id)
							return {
								title: comp?.title || 'Complemento não encontrado',
								price: comp?.price || 0,
								quantity: c.quantity,
							}
						}),
					)

					return {
						product_title: product?.title || 'Produto não encontrado',
						price: item.price_unit,
						quantity: item.quantity,
						complements: formattedComplements,
					}
				}),
			)

			const serialized_order = {
				id: order.id,
				customer_name: customerName,
				customer_whatsapp: customerWhatsapp,
				total_amount: order.total_amount,
				delivery_fee: order.delivery_fee,
				delivery_method: order.delivery_method,
				delivery_address: order.delivery_address,
				is_scheduled: order?.is_scheduled,
				scheduled_for: order?.scheduled_for,
				payment_method: order.payment_method,
				paid: order?.paid || false,
				status: order.status,
				created_at: order.created_at,
				items: itemsWithDetails,
			}
			// Retorno da API
			res.status(200).json({
				success: true,
				message: 'Registro encontrado com sucesso!',
				data: serialized_order,
			})
		} catch (error) {
			console.error('Erro ao buscar registro:', error)
			res.status(500).json({ success: false, error: 'Erro ao buscar registro' })
		}
	}
	//Atualizar pedido
	async update(req, res) {
		const id = Number(req.params.id)
		const { data } = req.body

		const existingOrder = await orderRepository.getById(id)

		if (!existingOrder) {
			return res.status(404).json({ success: false, error: 'Registro não encontrado' })
		}

		try {
			const updateOrder = await orderRepository.update(id, data)

			if (!updateOrder) {
				return res.status(404).json({
					success: false,
					error: 'Falha ao atualizar o pedido',
				})
			}
			//Retorno da API
			res.status(200).json({
				success: true,
				message: 'Registro atualizado com sucesso!',
				data: updateOrder,
			})
			//Tratamento de erros
		} catch (error) {
			console.error('Erro ao atualizar pedido:', error)
			res.status(500).json({
				success: false,
				error: error.message || 'Erro interno do servidor',
			})
		}
	}
	//Deletar pedido
	async delete(req, res) {
		const id = Number(req.params.id)

		const existingOrder = await orderRepository.getById(id)

		if (!existingOrder) {
			return res.status(404).json({ success: false, error: 'Registro não encontrado' })
		}

		try {
			const oldOrder = await orderRepository.delete(id)
			//Retorno da API
			res.status(200).json({
				success: true,
				message: 'Registro deletado com sucesso!',
				data: oldOrder,
			})
			//Tratamento de erros
		} catch (error) {
			console.error('Erro ao deletar registro: ', error)
			res.status(500).json({ success: false, error: 'Erro ao deletar registro' })
		}
	}
	// Criar um novo pedido via session
	async createFromSession(data) {
		let {
			total_amount,
			delivery_method = 'entrega',
			is_scheduled = 0,
			scheduled_for,
			delivery_address,
			payment_method,
			customer_name = null,
			customer_whatsapp = null,
			paid = 'false',
			status = 'confirmado',
			mercadopago_pay_id = null,
			created_at,
			fk_store_delivery_area_id,
			fk_delivery_address_id = null,
			fk_user_id = null,
			fk_store_id,
			items = [],
		} = data
		const deliveryAreaId = parseValidId(fk_store_delivery_area_id)
		const isPaidRequest = paid === true || paid === 'true' || paid === 1 || paid === '1'

		try {
			// Validar preço total do pedido
			let totalAdjusted = false
			const { shipping, calculatedTotal } = await calculateTotalOrderValue({
				items,
				fk_store_delivery_area_id,
				fk_store_id,
			})

			if (Math.abs(Number(total_amount) - calculatedTotal) > 0.01) {
				const userInfo = fk_user_id ? `user_id=${fk_user_id}` : `user=${customer_name}`
				logTamperedTotal(total_amount, calculatedTotal, userInfo)

				total_amount = calculatedTotal
				totalAdjusted = true
			}
			// Validar pagamento do pedido
			let isPaid = false
			if (paid === 'true') {
				const { success, status } = await checkPaymentStatus(mercadopago_pay_id)
				if (success && status === 'approved') {
					isPaid = true
				}
			}
			// Validar informações do cliente
			let customerName = customer_name
			let customerWhatsapp = customer_whatsapp
			// Se tiver user_id, busca os dados do usuário
			const userId = parseValidId(fk_user_id)
			if (userId) {
				const user = await userRepository.getById(userId)
				if (user) {
					customerName = user.name || customerName
					customerWhatsapp = user.whatsapp || customerWhatsapp
				}
			}
			// 1. Criar pedido
			const new_order = await orderRepository.create({
				total_amount,
				delivery_fee: shipping,
				delivery_method,
				is_scheduled,
				scheduled_for,
				delivery_address,
				payment_method,
				customer_name: customerName,
				customer_whatsapp: customerWhatsapp,
				paid: isPaid ? 'true' : 'false',
				status,
				mercadopago_pay_id,
				adjusted: totalAdjusted ? 'true' : 'false',
				created_at: created_at || new Date(),
				fk_store_delivery_area_id: deliveryAreaId,
				fk_delivery_address_id,
				fk_user_id,
				fk_store_id,
			})

			const order_id = new_order.id
			// 2. Criar itens do pedido
			const created_items = []
			for (const item of items) {
				const { quantity, fk_product_id } = item
				const price = await validateProductPrice(fk_product_id)

				const new_item = await orderItemsRepository.create({
					quantity: quantity,
					price_unit: price,
					fk_product_id: fk_product_id,
					fk_order_id: order_id,
				})
				// Salvar complementos
				if (Array.isArray(item.complements)) {
					for (const complement of item.complements) {
						const { quantity, fk_complement_id } = complement
						const price = await validateComplementPrice(fk_complement_id)

						await orderItemComplementsRepository.create({
							quantity: quantity || 1,
							price_unit: price,
							fk_order_item_id: new_item.id,
							fk_complement_id: fk_complement_id,
						})
					}
				}

				created_items.push(new_item)
			}

			// 3. Retornar resultado
			return {
				order: new_order,
				items: created_items,
			}
		} catch (error) {
			console.error('Erro ao criar pedido a partir da sessão:', error)
			throw new Error('Erro ao criar pedido a partir da sessão')
		}
	}
	async resolve(req, res) {
		const { fk_store_id, items } = req.body

		if (!items || !items.length) {
			return res.status(400).json({ success: false, error: 'Carrinho vazio' })
		}

		try {
			const resolvedItems = await Promise.all(
				items.map(async (item) => {
					const product = await productRepository.getById(item.fk_product_id)
					if (!product) return null

					const complements = await Promise.all(
						(item.complements || []).map(async (c) => {
							const comp = await complementRepository.getById(c.fk_complement_id)
							if (!comp) return null

							return {
								id: comp.id,
								title: comp.title,
								price: comp.price,
								quantity: c.quantity,
								subtotal: comp.price * c.quantity,
							}
						}),
					)

					const complementsTotal = complements.reduce((a, c) => a + c.subtotal, 0)

					return {
						id: product.id,
						title: product.title,
						price: product.price,
						quantity: item.quantity,
						subtotal: product.price * item.quantity,
						complements,
						total: product.price * item.quantity + complementsTotal,
					}
				}),
			)

			const total = resolvedItems.reduce((a, i) => a + i.total, 0)

			res.json({
				success: true,
				data: {
					items: resolvedItems,
					total,
				},
			})
		} catch (err) {
			console.error(err)
			res.status(500).json({ success: false, error: 'Erro ao resolver carrinho' })
		}
	}
}

export default new OrderController()
