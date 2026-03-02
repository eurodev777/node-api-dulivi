import { Payment } from 'mercadopago'
import { create as createPayment } from '../../services/mercadopago/payment/create.js'
import { get as getPayment } from '../../services/mercadopago/payment/get.js'
import { create as createCustomer } from '../../services/mercadopago/customer/create.js'
import { addCard } from '../../services/mercadopago/customer/addCard.js'

import userRepository from '../../repositories/user/user.repository.js'
import storeRepository from '../../repositories/store/store.repository.js'

import { getMercadoPagoClient } from '../../lib/mercadopago.js'
import { api } from '../../lib/whatsapp.js'

class PaymentController {
	// Criar cliente no Mercado Pago
	async handleCreateCustomer(req, res) {
		const store_id = req.params.id
		const { user_id, first_name, last_name, email, area_code, phone, cpf, id_address, cep, street, number } =
			req.body

		try {
			const access_token = await await storeRepository.getToken(store_id)
			if (!access_token) return res.status(404).json({ error: 'Token não encontrado' })
			const client = getMercadoPagoClient(access_token)

			const customer = await createCustomer(client, {
				first_name,
				last_name,
				email,
				area_code,
				phone,
				cpf,
				id_address,
				cep,
				street,
				number,
			})

			if (!customer) {
				return res.status(404).json({ error: 'Cliente não encontrado' })
			}

			//Adicionar campo customer_id do Mercado Pago ao usuário do Banco de Dados
			const updateUser = await userRepository.update(user_id, { customer_id: customer.id })

			if (!updateUser) {
				console.error(updateUser)
				return res.status(404).json({ message: 'Erro ao cadastrar cliente no Banco', error: updateUser })
			}

			//Retorno
			res.status(200).json({ message: 'Cliente criado com sucesso', data: customer })
			//Tratamento de erros
		} catch (error) {
			console.error('Erro ao criar cliente:', error)
			res.status(500).json({ error: 'Erro ao criar cliente' })
		}
	}
	// Adicionar novos cartões a um cliente do Mercado Pago
	async addCustomerCard(req, res) {
		const store_id = req.params.id
		const { token, customer_id } = req.body

		try {
			const access_token = await await storeRepository.getToken(store_id)
			if (!access_token) return res.status(404).json({ error: 'Token não encontrado' })
			const client = getMercadoPagoClient(access_token)

			const result = await addCard(client, token, customer_id)

			if (!result) {
				return res.status(404).json({ error: 'Erro ao adicionar cartão' })
			}

			return res.send({ data: result })
		} catch (error) {
			console.error('Erro em adicionar novos cartões a um cliente:', error)
			res.status(500).json({ error: error.message })
		}
	}
	// Pagar no Crédito
	async createCreditCardPayment(req, res) {
		const store_id = req.params.id
		const { transaction_amount, token, email, cpf, payment_method_id, phone_number } = req.body
		// Validação para o número do usuário
		if (!phone_number || typeof phone_number !== 'string') {
			return res.status(400).json({ error: 'Número do usuário inválido ou ausente' })
		}

		try {
			// Buscar mercadopago_access_token
			const access_token = await await storeRepository.getToken(store_id)
			if (!access_token) return res.status(404).json({ error: 'Token não encontrado' })
			// Gerar client
			const client = getMercadoPagoClient(access_token)
			// Mercado Pago Func
			const result = await createPayment(client, {
				transaction_amount,
				token,
				email,
				cpf,
				payment_method_id,
			})

			if (!result) {
				return res.status(404).json({ error: 'Erro ao processar pagamento' })
			}
			// Tenta enviar a mensagem, mas não interrompe o fluxo se falhar
			// api.post('/send', {
			// 	phone_number,
			// 	message: 'Pedido pago com sucesso',
			// })

			return res.send({
				data: {
					status: result.status,
					paymentId: result.id,
					response: result,
				},
			})
		} catch (error) {
			console.error('Erro ao processar pagamento:', error)
			res.status(500).json({
				error: error.message || 'Erro ao processar pagamento',
			})
		}
	}
	// Pagar no PIX
	async createPixPayment(req, res) {
		const store_id = req.params.id
		const { value, email, phone_number } = req.body
		// Validação para o número do usuário
		if (!phone_number || typeof phone_number !== 'string') {
			return res.status(400).json({ error: 'Número do usuário inválido ou ausente' })
		}
		// Validação para o valor
		if (!value || typeof value !== 'number' || value <= 0) {
			return res.status(400).json({ error: 'Valor do pagamento inválido' })
		}

		try {
			const access_token = await await storeRepository.getToken(store_id)
			if (!access_token) return res.status(404).json({ error: 'Token não encontrado' })
			const client = getMercadoPagoClient(access_token)

			const payment = await new Payment(client).create({
				body: {
					transaction_amount: value,
					payment_method_id: 'pix',
					payer: {
						email: email,
					},
				},
			})

			if (!payment) {
				return res.status(404).json({ error: 'Erro ao processar pagamento' })
			}

			// await api.post('/send', { phone_number, message: 'Pedido pago com sucesso' })

			res.send({
				data: {
					qrcode: payment.point_of_interaction.transaction_data.qr_code_base64,
					copiaecola: payment.point_of_interaction.transaction_data.qr_code,
				},
			})
		} catch (error) {
			console.error('Erro ao processar pagamento:', error)
			res.status(500).json({
				error: error.message || 'Erro ao processar pagamento',
			})
		}
	}
	// Status de um pagamento
	async checkPaymentStatus(req, res) {
		const store_id = req.params.id
		const payment_id = req.body.payment_id

		if (!payment_id) {
			return res.status(400).json({ error: 'ID do pagamento não fornecido' })
		}

		try {
			const access_token = await await storeRepository.getToken(store_id)
			if (!access_token) return res.status(404).json({ error: 'Token não encontrado' })
			const client = getMercadoPagoClient(access_token)

			const payment_info = await getPayment(client, payment_id)
			if (!payment_info) {
				return res.status(404).json({ success: false, error: 'Pagamento não encontrado' })
			}

			if (payment_info?.status === 'approved') {
				return res.status(200).json({ success: true, message: 'Pagamento aprovado', data: payment_info })
			}

			return res.status(200).json({
				success: true,
				message: `Status do pagamento: ${payment_info.status}`,
				data: payment_info,
			})
		} catch (error) {
			console.error(`[Erro Mercado Pago] Falha ao consultar pagamento ${payment_id}:`, error)
			res.status(500).json({ error: 'Erro ao processar pagamento' })
		}
	}
}

export default new PaymentController()
