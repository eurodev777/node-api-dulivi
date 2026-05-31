import { createPixPayment as createPixPaymentService } from '../../services/asaas/createPixPayment.js'
import { asaas } from '../../lib/asaas.js'
import { api } from '../../lib/whatsapp.js'

class PaymentController {
	// Pagar no Crédito
	async createCreditCardPayment(req, res) {
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
	// Pagar no PIX
	async createPixPayment(req, res) {
		try {
			const { value, name, email, cpfCnpj } = req.body

			const result = await createPixPaymentService({
				value,
				name,
				email,
				cpfCnpj,
			})

			return res.json(result)
		} catch (err) {
			console.error(err.response?.data || err)

			return res.status(500).json({
				error: 'Erro ao gerar PIX',
			})
		}
	}
	// Status de um pagamento
	async checkPaymentStatus(req, res) {
		try {
			const { payment_id } = req.body

			if (!payment_id) {
				return res.status(400).json({
					error: 'ID do pagamento não fornecido',
				})
			}

			const payment = await asaas.get(`/payments/${payment_id}`)

			return res.json({
				success: true,
				data: payment.data,
			})
		} catch (err) {
			console.error(err.response?.data || err)

			return res.status(500).json({
				error: 'Erro ao consultar pagamento',
			})
		}
	}
}

export default new PaymentController()
