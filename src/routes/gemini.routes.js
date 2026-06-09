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
	'AC',
	'AL',
	'AP',
	'AM',
	'BA',
	'CE',
	'DF',
	'ES',
	'GO',
	'MA',
	'MT',
	'MS',
	'MG',
	'PA',
	'PB',
	'PR',
	'PE',
	'PI',
	'RJ',
	'RN',
	'RS',
	'RO',
	'RR',
	'SC',
	'SP',
	'SE',
	'TO',
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
		const userPrompt = `
Você é um especialista em criação de anúncios para SaaS.

Crie uma especificação criativa PREMIUM para o SaaS Dulivi.

OBJETIVO:

Convencer donos de restaurantes, lanchonetes, pizzarias, hamburguerias e deliverys a criar gratuitamente seu Cardápio Digital.

REGRAS OBRIGATÓRIAS:

- O título deve focar em criar um Cardápio Digital grátis.
- O título deve ter no máximo 7 palavras.
- O título deve ser extremamente chamativo.
- O título deve parecer uma oferta irresistível.
- O benefício principal é GRATUIDADE.

NUNCA usar nos títulos:

- WhatsApp
- Automação
- Gestão
- Marketplace
- Sistema

Esses assuntos podem aparecer apenas no hook.

BADGES PERMITIDOS:

- CRIAR GRÁTIS
- COMECE GRÁTIS
- TESTE GRÁTIS

EXEMPLOS DE TÍTULOS:

- Crie Grátis Seu Cardápio Digital
- Monte Seu Cardápio Grátis Hoje
- Criar Cardápio Digital Delivery Online Grátis
- Cardápio Digital + Anúncios Online

CORES:

Utilize uma destas combinações modernas:

1.
accentColor: #1D84FF
bgGradientStart: #FFFFFF
bgGradientEnd: #EAF4FF

2.
accentColor: #FF6B00
bgGradientStart: #1D84FF
bgGradientEnd: #60A5FA

3.
accentColor: #7C3AED
bgGradientStart: #EC4899
bgGradientEnd: #8B5CF6

4.
accentColor: #06B6D4
bgGradientStart: #FFFFFF
bgGradientEnd: #CFFAFE

5.
accentColor: #F97316
bgGradientStart: #FFF7ED
bgGradientEnd: #FED7AA

RESPONDA APENAS EM JSON:

{
  "title": "",
  "hook": "",
  "badge": "",
  "accentColor": "",
  "bgGradientStart": "",
  "bgGradientEnd": "",
  "bgImagePrompt": ""
}
`

		const response = await ai.models.generateContent({
			model: 'gemini-2.0-flash-lite',
			contents: userPrompt,
			config: {
				responseMimeType: 'application/json',
			},
		})

		const resultText = response.text?.trim() || ''
		const parsed = JSON.parse(resultText)
		res.json(parsed)
	} catch (error) {
		console.error('Error generating creative prompt:', error)

		const fallbacks = [
			{
				title: 'Crie Grátis Seu Cardápio Digital',
				hook: 'Receba pedidos pelo WhatsApp e venda mais.',
				badge: 'CARDÁPIO GRÁTIS',
				accentColor: '#1D84FF',
				bgGradientStart: '#FFFFFF',
				bgGradientEnd: '#EAF4FF',
			},
			{
				title: 'Criar Cardápio Digital Delivery Online Grátis',
				hook: 'Compartilhe seu link e receba pedidos.',
				badge: 'CRIAR GRÁTIS',
				accentColor: '#FF6B00',
				bgGradientStart: '#1D84FF',
				bgGradientEnd: '#60A5FA',
			},
			{
				title: 'Monte Seu Cardápio Grátis Hoje',
				hook: 'Venda online sem pagar comissões.',
				badge: '100% GRÁTIS',
				accentColor: '#7C3AED',
				bgGradientStart: '#EC4899',
				bgGradientEnd: '#8B5CF6',
			},
			{
				title: 'Cardápio Digital + Anúncios Online',
				hook: 'Seu delivery online em poucos minutos.',
				badge: 'SEM CUSTO',
				accentColor: '#06B6D4',
				bgGradientStart: '#FFFFFF',
				bgGradientEnd: '#CFFAFE',
			},
		]

		const selectedFallback = fallbacks[Math.floor(Math.random() * fallbacks.length)]
		res.json(selectedFallback)
	}
})

export default router
