import productRepository from '../repositories/store/product.repository.js'
import complementRepository from '../repositories/store/complement.repository.js'
import deliveryAreaRepository from '../repositories/store/deliveryArea.repository.js'
import storeRepository from '../repositories/store/store.repository.js'
import round from '../utils/math.js'

export const calculateTotalOrderValue = async ({ items, fk_store_delivery_area_id, fk_store_id }) => {
	let subtotal = 0

	for (const item of items) {
		const product = await productRepository.getById(item.fk_product_id)
		if (!product) throw new Error(`Produto ID ${item.fk_product_id} não encontrado`)

		const productTotal = round(Number(product.price) * item.quantity)
		subtotal += productTotal

		if (Array.isArray(item.complements)) {
			for (const complement of item.complements) {
				const comp = await complementRepository.getById(complement.fk_complement_id)
				if (!comp) throw new Error(`Complemento ID ${complement.fk_complement_id} não encontrado`)

				const compTotal = round(Number(comp.price) * (complement.quantity || 1))
				subtotal += compTotal
			}
		}
	}
	// Calcular frete
	let shipping = 0

	const deliveryAreaId = Number(fk_store_delivery_area_id)

	if (deliveryAreaId > 0) {
		const area = await deliveryAreaRepository.getById(deliveryAreaId)

		if (area) {
			shipping = Number(area.delivery_fee)
		} else {
			const store = await storeRepository.getById(fk_store_id)
			shipping = store ? Number(store.default_delivery_fee) : 0
		}
	} else {
		const store = await storeRepository.getById(fk_store_id)
		shipping = store ? Number(store.default_delivery_fee) : 0
	}

	shipping = round(shipping)
	// total
	const total = round(subtotal + shipping)

	return {
		shipping,
		calculatedTotal: total,
	}
}
