import { Payment } from 'mercadopago'
import { v4 as uuidv4 } from 'uuid'

export const create = async (client, reqBody) => {
	const { transaction_amount, token, email, cpf, payment_method_id } = reqBody

	const body = {
		transaction_amount: Number(transaction_amount),
		token,
		description: 'Pedido Dulivi',
		installments: 1,
		payment_method_id,
		binary_mode: true,

		external_reference: uuidv4(),

		payer: {
			email,
			identification: {
				type: 'CPF',
				number: cpf,
			},
		},

		additional_info: {
			items: [
				{
					id: 'pedido',
					title: 'Pedido Delivery',
					quantity: 1,
					unit_price: Number(transaction_amount),
				},
			],
		},
	}

	try {
		return await new Payment(client).create({
			body: body,
			requestOptions: { idempotencyKey: uuidv4() },
		})
	} catch (error) {
		console.error('Erro ao criar pagamento:', error)
		if (error.status === 404) {
			return null
		}
		throw error
	}
}
