import express from 'express'
import { GoogleGenAI } from '@google/genai';
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
});

const BRAZIL_STATES = [
  { name: 'São Paulo', uf: 'SP' },
  { name: 'Rio de Janeiro', uf: 'RJ' },
  { name: 'Minas Gerais', uf: 'MG' },
  { name: 'Rio Grande do Sul', uf: 'RS' },
  { name: 'Paraná', uf: 'PR' },
  { name: 'Santa Catarina', uf: 'SC' },
  { name: 'Bahia', uf: 'BA' },
  { name: 'Pernambuco', uf: 'PE' },
  { name: 'Ceará', uf: 'CE' },
  { name: 'Goiás', uf: 'GO' },
  { name: 'Espírito Santo', uf: 'ES' },
  { name: 'Distrito Federal', uf: 'DF' },
  { name: 'Maranhão', uf: 'MA' },
  { name: 'Paraíba', uf: 'PB' },
  { name: 'Rio Grande do Norte', uf: 'RN' },
  { name: 'Alagoas', uf: 'AL' },
  { name: 'Mato Grosso', uf: 'MT' },
  { name: 'Mato Grosso do Sul', uf: 'MS' }
];

router.post('/api/generate-creative-prompts', async (req, res) => {
  try {
    const cuisineTypes = ['Burgers', 'Pizza', 'Sushi', 'General Delivery', 'Açai', 'Hot Dog', 'Marmitaria', 'Italian Food'];
    const chosenCuisine = cuisineTypes[Math.floor(Math.random() * cuisineTypes.length)];

    const userPrompt = `Gere uma especificação criativa de anúncio para o SaaS "Dulivi" (sistema completo de cardápio digital, robô de atendimento WhatsApp, pedidos online, teste de 15 dias grátis).
    O foco desta arte deve ser no nicho de ${chosenCuisine} para delivery.
    Quero receber detalhes de cores, um título alternativo chamativo em português, e um PROMPT em inglês muito bom para gerar o fundo da imagem no Pollinations AI (que gera imagens com base em texto).
    O prompt em inglês deve pedir uma ilustração moderna minimalista ou estilo 3D de comida, com iluminação neon, sem nenhum texto escrito na imagem (importantíssimo: "no text", "no words").
    
    Responda estritamente em formato JSON seguindo este esquema:
    {
      "title": "Título moderno secundário",
      "hook": "Uma copy chamativa e persuasiva curta em português",
      "badge": "Frase de destaque rápido (ex: 15 dias grátis)",
      "accentColor": "Uma cor hex moderna para realce (ex: #FF5A1F)",
      "bgGradientStart": "Uma cor hex escura de fundo (ex: #0F172A)",
      "bgGradientEnd": "Uma cor hex escura complementar (ex: #1E293B)",
      "bgImagePrompt": "Prompt em inglês focado em ilustração ou 3D de comida delivery (ex: 'A vibrant 3D rendering of a delicious burger with melting cheese, isometric minimal flat vector background, neon orange styling, high resolution, soft shadows, no text, copy space')"
    }`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userPrompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const resultText = response.text?.trim() || "";
    const parsed = JSON.parse(resultText);
    res.json(parsed);
  } catch (error) {
    console.error('Error generating creative prompt:', error);

    // Graceful fallback if Gemini API is busy or has issues
    const cuisineTypes = ['Burgers', 'Pizza', 'Sushi', 'Pastéis', 'Açai'];
    const fallbackCuisine = cuisineTypes[Math.floor(Math.random() * cuisineTypes.length)];

    const fallbacks = [
      {
        title: "Dulivi Delivery",
        hook: `Turbine suas vendas de ${fallbackCuisine} no WhatsApp!`,
        badge: "15 Dias Grátis",
        accentColor: "#F97316",
        bgGradientStart: "#0F172A",
        bgGradientEnd: "#1E293B",
        bgImagePrompt: `Delicious gourmet ${fallbackCuisine} box delivery, minimalist 3D food illustration, flat design vector, high contrast, studio lighting, no text, dark background`
      },
      {
        title: "Cardápio Inteligente",
        hook: "Seu cliente pede em segundos, sem pagar comissões!",
        badge: "Teste Sem Custos",
        accentColor: "#D97706",
        bgGradientStart: "#1E1B4B",
        bgGradientEnd: "#312E81",
        bgImagePrompt: "A colorful digital smartphone showing a beautiful food menu, glowing digital items floating, vector illustration, style of tech startup, dark aesthetic background, no words"
      },
      {
        title: "Atendimento no Zap",
        hook: "Robô inteligente responde e anota pedidos sozinho!",
        badge: "Sistema Completo",
        accentColor: "#22C55E",
        bgGradientStart: "#022C22",
        bgGradientEnd: "#064E3B",
        bgImagePrompt: "Isometric illustration of green chat bubbles, delicious pizza delivery box, glowing neon green icons, flat vector style, darkness environment, copy space, no spelling"
      }
    ];

    const selectedFallback = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    res.json(selectedFallback);
  }
});

router.post('/api/generate-leads', async (req, res) => {
  try {
    const randomStateObj =
      BRAZIL_STATES[Math.floor(Math.random() * BRAZIL_STATES.length)];

    const userPrompt = `
Escolha o estado brasileiro "${randomStateObj.name}" (${randomStateObj.uf}).

Selecione exatamente 20 cidades deste estado.

Priorize cidades com:
- alta população
- forte mercado de delivery
- muitas hamburguerias, pizzarias e restaurantes

Para cada cidade gere:
- nome
- motivo curto de prospecção

Responda APENAS JSON válido neste formato:

{
  "state": "Nome do Estado",
  "uf": "SIGLA",
  "cities": [
    {
      "name": "Nome da Cidade",
      "metric": "Motivo curto"
    }
  ]
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userPrompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const resultText = response.text?.trim();

    if (!resultText) {
      return res.status(500).json({
        success: false,
        error: 'A IA retornou uma resposta vazia.',
      });
    }

    let parsed;

    try {
      parsed = JSON.parse(resultText);
    } catch (parseError) {
      console.error('Erro ao converter JSON:', resultText);

      return res.status(500).json({
        success: false,
        error: 'A IA retornou um JSON inválido.',
        raw: resultText,
      });
    }

    return res.json({
      success: true,
      data: parsed,
    });
  } catch (error) {
    console.error('Error generating leads:', error);

    return res.status(500).json({
      success: false,
      error: error?.message || 'Erro desconhecido ao gerar leads.',
      details: error,
    });
  }
});

export default router
