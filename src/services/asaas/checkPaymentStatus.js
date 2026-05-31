export const checkPaymentStatus = async (req, res) => {
	try {
		const { payment_id } = req.body

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
