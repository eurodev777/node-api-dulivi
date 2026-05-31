export const createCreditCardPayment = async (req, res) => {
	try {
		const {
			value,
			name,
			email,
			cpfCnpj,
			phone,
			postalCode,
			addressNumber,

			card_holder_name,
			card_number,
			card_expiry_month,
			card_expiry_year,
			card_ccv,
		} = req.body

		const customer = await asaas.post('/customers', {
			name,
			email,
			cpfCnpj,
		})

		const payment = await asaas.post('/payments', {
			customer: customer.data.id,
			billingType: 'CREDIT_CARD',
			value,
			dueDate: new Date().toISOString().slice(0, 10),

			creditCard: {
				holderName: card_holder_name,
				number: card_number,
				expiryMonth: card_expiry_month,
				expiryYear: card_expiry_year,
				ccv: card_ccv,
			},

			creditCardHolderInfo: {
				name,
				email,
				cpfCnpj,
				postalCode,
				addressNumber,
				phone,
			},
		})

		return res.json({
			success: true,
			paymentId: payment.data.id,
			status: payment.data.status,
		})
	} catch (err) {
		console.error(err.response?.data || err)

		return res.status(500).json({
			error: 'Erro ao processar pagamento',
		})
	}
}
