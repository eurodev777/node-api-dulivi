import axios from 'axios'
import { ASAAS_API_KEY, ASAAS_BASE_URL } from '../config/env.js'

export const asaas = axios.create({
	baseURL: ASAAS_BASE_URL,
	headers: {
		'Content-Type': 'application/json',
		access_token: ASAAS_API_KEY,
		'User-Agent': 'Dulivi Cardapio Digital',
	},
})
