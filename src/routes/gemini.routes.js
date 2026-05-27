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

    const userPrompt = `Gere uma especificação criativa PREMIUM de anúncio para o SaaS "Dulivi".

    O produto oferece:
    - Cardápio Digital
    - Robô de WhatsApp
    - Sistema de pedidos online
    - Gestão para delivery
    - TESTE GRÁTIS POR 15 DIAS (isso é o MAIS IMPORTANTE do anúncio)
    
    O foco desta arte deve ser no nicho de ${chosenCuisine} para delivery.
    
    REGRAS IMPORTANTES:
    - O destaque PRINCIPAL da arte deve SEMPRE ser a oferta "15 DIAS GRÁTIS"
    - O hook deve SEMPRE complementar essa oferta
    - TODOS os hooks devem mencionar teste grátis, 15 dias grátis, grátis ou sem custo
    - O badge deve ser extremamente curto, forte e chamativo
    - O badge será usado visualmente em destaque grande na imagem
    - O hook NÃO deve competir com o badge
    - O estilo deve parecer anúncio moderno de startup SaaS premium
    - O tom deve gerar urgência e desejo
    - Evite hooks genéricos
    
    Quero receber:
    - Um título moderno
    - Um hook curto e persuasivo
    - Um badge extremamente chamativo
    - Cores modernas
    - Um prompt em inglês para gerar fundo visual no Pollinations AI
    
    O prompt da imagem deve:
    - pedir ilustração moderna food delivery
    - estilo 3D ou minimalista
    - iluminação neon
    - fundo premium
    - sem textos escritos
    - muito espaço vazio para adicionar textos depois
    - visual de anúncio profissional
    - "no text", "no words", "typography free"
    
    Responda STRICTAMENTE em JSON:
    
    {
      "title": "Título moderno",
      "hook": "Copy curta mencionando teste grátis",
      "badge": "15 DIAS GRÁTIS",
      "accentColor": "#FF5A1F",
      "bgGradientStart": "#0F172A",
      "bgGradientEnd": "#1E293B",
      "bgImagePrompt": "Prompt em inglês"
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
        title: "Seu Delivery Mais Profissional",
        hook: `Teste grátis por 15 dias e automatize seu delivery de ${fallbackCuisine}!`,
        badge: "15 DIAS GRÁTIS",
        accentColor: "#F97316",
        bgGradientStart: "#0F172A",
        bgGradientEnd: "#1E293B",
        bgImagePrompt: `Premium gourmet ${fallbackCuisine} delivery scene, modern 3D food illustration, neon lighting, dark luxury background, food advertising aesthetic, empty copy space, ultra detailed, no text, no words, typography free`
      },
      {
        title: "Venda Mais no WhatsApp",
        hook: "Use grátis por 15 dias e receba pedidos automaticamente!",
        badge: "TESTE GRÁTIS",
        accentColor: "#22C55E",
        bgGradientStart: "#052E16",
        bgGradientEnd: "#14532D",
        bgImagePrompt: "Modern smartphone food delivery interface, glowing whatsapp notifications, premium startup style, dark background, neon green lights, realistic 3D render, empty space for typography, no text"
      },
      {
        title: "Cardápio Digital Inteligente",
        hook: "15 dias grátis para transformar seu delivery hoje.",
        badge: "SEM CUSTO",
        accentColor: "#EAB308",
        bgGradientStart: "#1E1B4B",
        bgGradientEnd: "#312E81",
        bgImagePrompt: "Luxury food delivery marketing illustration, premium burger and fries composition, cinematic neon lighting, modern SaaS advertising style, dark background, clean composition, no text, no typography"
      }
    ];

    const selectedFallback = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    res.json(selectedFallback);
  }
});

export default router
