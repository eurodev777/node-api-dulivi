import { asaas } from '../../lib/asaas.js'

export const createPixPayment = async (req, res) => {
	try {
		const { value, name, email, cpfCnpj } = req.body

		const customer = await asaas.post('/customers', {
			name,
			email,
			cpfCnpj,
		})

		const payment = await asaas.post('/payments', {
			customer: customer.data.id,
			billingType: 'PIX',
			value,
			dueDate: new Date().toISOString().slice(0, 10),
			description: 'Pix para novo pedido no cardápio Dulivi',
		})

		const pixQrCode = await asaas.get(`/payments/${payment.data.id}/pixQrCode`)

		return res.json({
			success: true,
			paymentId: payment.data.id,
			qrcode: pixQrCode.data.encodedImage,
			copiaecola: pixQrCode.data.payload,
		})
	} catch (err) {
		console.error(err.response?.data || err)

		return res.status(500).json({
			error: 'Erro ao gerar PIX',
		})
	}
}
