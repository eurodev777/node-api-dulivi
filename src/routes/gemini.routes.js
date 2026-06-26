import express from 'express'
import { GoogleGenAI } from '@google/genai'
import { GEMINI_API_KEY } from '../config/env.js'

const router = express.Router()

const gemini_key = GEMINI_API_KEY

const ai = new GoogleGenAI({
	apiKey: gemini_key,
	httpOptions: {
		headers: {
			'User-Agent': 'aistudio-build',
		},
	},
})

const STATE_UFS = [
	'SP', // São Paulo
	'MG', // Minas Gerais
	'RJ', // Rio de Janeiro
	'PR', // Paraná
	'SC', // Santa Catarina
	'GO', // Goiás
	'RS', // Rio Grande do Sul
	'BA', // Bahia
	'CE', // Ceará
	'PE', // Pernambuco
	'PA', // Pará
]

const METRICS = [
	'Grande potencial para delivery e restaurantes.',
	'Alta densidade populacional e consumo digital.',
	'Cidade forte para pizzarias e hamburguerias.',
	'Mercado gastronômico aquecido.',
	'Alta demanda por pedidos online.',
	'Forte presença de delivery no WhatsApp.',
	'Cidade com crescimento comercial acelerado.',
	'Excelente público para cardápio digital.',
	'Região estratégica para prospecção.',
	'Mercado local muito ativo para alimentação.',
	'Cidade com forte vida noturna e consumo.',
	'Público jovem e alto uso de delivery.',
	'Alto crescimento de restaurantes locais.',
	'Ótimo potencial para automação de pedidos.',
	'Economia regional forte e público consumidor.',
]

router.post('/api/generate-leads', async (req, res) => {
	try {
		// escolhe UF aleatória
		const randomUF = STATE_UFS[Math.floor(Math.random() * STATE_UFS.length)]

		// busca dados do estado
		const stateResponse = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${randomUF}`)

		if (!stateResponse.ok) {
			throw new Error('Erro ao buscar estado no IBGE')
		}

		const stateData = await stateResponse.json()

		// busca municípios
		const citiesResponse = await fetch(
			`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${randomUF}/municipios`,
		)

		if (!citiesResponse.ok) {
			throw new Error('Erro ao buscar municípios no IBGE')
		}

		const citiesData = await citiesResponse.json()

		// embaralha cidades
		const shuffledCities = [...citiesData].sort(() => Math.random() - 0.5)

		// pega 20 cidades
		const selectedCities = shuffledCities.slice(0, 20)

		// monta estrutura
		const formattedCities = selectedCities.map((city) => ({
			name: city.nome,
			metric: METRICS[Math.floor(Math.random() * METRICS.length)],
		}))

		return res.json({
			success: true,
			data: {
				state: stateData.nome,
				uf: stateData.sigla,
				cities: formattedCities,
			},
		})
	} catch (error) {
		console.error('Erro generate-leads:', error)

		return res.status(500).json({
			success: false,
			error: error instanceof Error ? error.message : 'Erro interno ao gerar leads.',
		})
	}
})

router.post('/api/generate-creative-prompts', async (req, res) => {
	try {
		const prompt = `
Você é um diretor de marketing especialista em SaaS para restaurantes.

Crie um criativo para um sistema de restaurantes.

O foco PRINCIPAL deve ser sempre:

1. Robô para WhatsApp
2. Atendimento com IA
3. Cardápio Digital
4. Anúncios Facebook, Instagram e Google

Retorne APENAS um JSON.

Formato:

{
  "title":"",
  "hook":"",
  "badge":"",
  "imagePrompt":""
}

Regras:

O title deve ter até 38 caracteres.

O hook até 70 caracteres.

badge:
- IA
- NOVIDADE
- AUTOMAÇÃO
- WHATSAPP
- DELIVERY

O imagePrompt deve descrever uma imagem publicitária moderna, sem texto, contendo:

- restaurante moderno
- smartphone mostrando conversa WhatsApp
- interface de cardápio digital
- elementos de inteligência artificial
- notificações de pedidos
- estilo premium
- iluminação cinematográfica
- fundo azul (#1F84FF)
- muito espaço negativo para adicionar textos
- qualidade de propaganda profissional
- sem marcas
- sem logos
- sem pessoas famosas
- sem texto na imagem
`
		const titles = [
			'Robô para WhatsApp',
			'Atendimento com IA',
			'WhatsApp Inteligente',
			'IA Para Restaurantes',
			'Automatize Seu WhatsApp',
			'Cardápio Digital',
			'Cardápio Digital Grátis',
			'Seu Restaurante com IA',
			'Automação Para Delivery',
			'Pedidos Pelo WhatsApp',
			'Venda Mais no WhatsApp',
			'Atendimento Virtual IA',
			'Restaurante Inteligente',
			'Delivery Automatizado',
			'Cardápio + Robô IA',
			'WhatsApp Que Vende',
			'IA Que Responde Clientes',
			'Receba Pedidos Automático',
			'Robô Que Fecha Pedidos',
			'Seu Delivery Mais Inteligente',
		]

		const hooks = [
			'Atenda clientes automaticamente com Inteligência Artificial.',
			'Receba pedidos pelo WhatsApp sem esforço.',
			'Crie seu cardápio digital em poucos minutos.',
			'Automatize seu restaurante com IA.',
			'Venda mais usando WhatsApp e IA.',
			'Atendimento 24 horas para seus clientes.',
			'Anuncie no Google, Facebook e Instagram.',
			'Cardápio digital completo para delivery.',
			'Transforme seu WhatsApp em uma máquina de vendas.',
			'Mais pedidos, menos trabalho manual.',
			'Automação completa para restaurantes.',
			'Seu atendente virtual nunca para.',
			'Clientes fazem pedidos sozinhos.',
			'IA que responde seus clientes instantaneamente.',
			'Tudo que seu restaurante precisa em um só lugar.',
		]

		const badges = ['IA', 'WHATSAPP', 'ROBÔ IA', 'DELIVERY', 'CARDÁPIO', 'AUTOMAÇÃO', 'NOVO']

		const colorSchemes = [
			{
				accentColor: '#1D84FF',
				bgGradientStart: '#FFFFFF',
				bgGradientEnd: '#EAF4FF',
			},
			{
				accentColor: '#FF6B00',
				bgGradientStart: '#1D84FF',
				bgGradientEnd: '#60A5FA',
			},
			{
				accentColor: '#7C3AED',
				bgGradientStart: '#EC4899',
				bgGradientEnd: '#8B5CF6',
			},
			{
				accentColor: '#06B6D4',
				bgGradientStart: '#FFFFFF',
				bgGradientEnd: '#CFFAFE',
			},
			{
				accentColor: '#F97316',
				bgGradientStart: '#FFF7ED',
				bgGradientEnd: '#FED7AA',
			},
		]

		const random = (arr) => arr[Math.floor(Math.random() * arr.length)]

		const color = random(colorSchemes)

		// const creative = {
		// 	title: random(titles),
		// 	hook: random(hooks),
		// 	badge: random(badges),

		// 	accentColor: color.accentColor,
		// 	bgGradientStart: color.bgGradientStart,
		// 	bgGradientEnd: color.bgGradientEnd,
		// }

		const response = await ai.models.generateContent({
			model: 'gemini-2.5-flash',
			contents: prompt,
		})

		const text = response.text

		console.log(text) // deixe isso enquanto testa

		const jsonMatch = text.match(/\{[\s\S]*\}/)

		if (!jsonMatch) {
			throw new Error('Gemini não retornou um JSON válido.')
		}

		const creative = JSON.parse(jsonMatch[0])

		creative.accentColor = color.accentColor
		creative.bgGradientStart = color.bgGradientStart
		creative.bgGradientEnd = color.bgGradientEnd

		res.json(creative)
	} catch (error) {
		console.error(error)

		res.status(500).json({
			error: 'Erro ao gerar criativo',
		})
	}
})

export default router
