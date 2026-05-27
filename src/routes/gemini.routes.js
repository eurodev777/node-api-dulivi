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
];

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
];

router.post('/api/generate-leads', async (req, res) => {
  try {
    // escolhe UF aleatória
    const randomUF =
      STATE_UFS[Math.floor(Math.random() * STATE_UFS.length)];

    // busca dados do estado
    const stateResponse = await fetch(
      `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${randomUF}`
    );

    if (!stateResponse.ok) {
      throw new Error('Erro ao buscar estado no IBGE');
    }

    const stateData = await stateResponse.json();

    // busca municípios
    const citiesResponse = await fetch(
      `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${randomUF}/municipios`
    );

    if (!citiesResponse.ok) {
      throw new Error('Erro ao buscar municípios no IBGE');
    }

    const citiesData = await citiesResponse.json();

    // embaralha cidades
    const shuffledCities = [...citiesData].sort(
      () => Math.random() - 0.5
    );

    // pega 20 cidades
    const selectedCities = shuffledCities.slice(0, 20);

    // monta estrutura
    const formattedCities = selectedCities.map((city) => ({
      name: city.nome,
      metric:
        METRICS[Math.floor(Math.random() * METRICS.length)],
    }));

    return res.json({
      success: true,
      data: {
        state: stateData.nome,
        uf: stateData.sigla,
        cities: formattedCities,
      },
    });
  } catch (error) {
    console.error('Erro generate-leads:', error);

    return res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Erro interno ao gerar leads.',
    });
  }
});

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
      model: 'gemini-2.0-flash-lite',
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

export default router
