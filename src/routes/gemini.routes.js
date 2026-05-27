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
      model: 'gemini-3.5-flash',
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

// Endpoint to generate standard Brazil cities list for lead generation
router.post('/api/generate-leads', async (req, res) => {
  try {
    const randomStateObj = BRAZIL_STATES[Math.floor(Math.random() * BRAZIL_STATES.length)];
    
    const userPrompt = `Escolha o estado brasileiro "${randomStateObj.name}" (${randomStateObj.uf}).
    Selecione exatamente 20 cidades deste estado.
    Priorize cidades com alta população e um mercado muito forte para hamburguerias, pizzarias, e restaurantes de delivery.
    Para cada cidade selecionada, forneça o nome correto e um motivo curto de mercado (ex: "IDH Alto, forte apetite por pizzarias", "Centro universitário com alto delivery", "Grande população de classe média e hamburguerias").

    Responda estritamente no formato JSON seguindo este esquema:
    {
      "state": "Nome do Estado",
      "uf": "SIGLA",
      "cities": [
        {
          "name": "Nome da Cidade",
          "metric": "Destaque curto de prospecção"
        }
      ]
    }`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: userPrompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const resultText = response.text?.trim() || "";
    const parsed = JSON.parse(resultText);
    res.json(parsed);
  } catch (error) {
    console.error('Error generating leads:', error);
    
    // In case of error, select a detailed static list fallback based on a random state
    const fallbackStates = [
      {
        state: "São Paulo",
        uf: "SP",
        cities: [
          { name: "São Paulo", metric: "Metrópole gigante, +40 mil pizzarias e hamburguerias." },
          { name: "Campinas", metric: "Grande polo tecnológico e universitário, alto delivery." },
          { name: "Santos", metric: "Litoral populoso com forte consumo noturno de hambúrgueres." },
          { name: "São José dos Campos", metric: "Polo aeroespacial, classe média de alto poder aquisitivo." },
          { name: "Ribeirão Preto", metric: "Capital do agronegócio e polo gastronômico regional." },
          { name: "Sorocaba", metric: "Crescimento contínuo e forte demanda de bairros residenciais." },
          { name: "Santo André", metric: "Região do ABC com alta densidade demográfica e lanchonetes." },
          { name: "São Bernardo do Campo", metric: "Consumo gigantesco e excelentes taxas fiscais de comércio." },
          { name: "Osasco", metric: "Forte comércio central e enorme potencial de delivery rápido." },
          { name: "Guarulhos", metric: "Segunda maior cidade do estado, mercado gastronômico enorme." },
          { name: "Piracicaba", metric: "Grande polo estudantil e ampla rede de hamburguerias locais." },
          { name: "Jundiaí", metric: "Forte IDH, proximidade à SP e alta demanda por comida gourmet." },
          { name: "Mogi das Cruzes", metric: "Região metropolitana com crescimento acelerado de pizzarias." },
          { name: "Bauru", metric: "Cidade universitária com alto giro de pedidos no WhatsApp." },
          { name: "Barueri", metric: "Região rica (Alphaville) com ticket médio altíssimo no delivery." },
          { name: "São José do Rio Preto", metric: "Centro nervoso do noroeste paulista próspero e gastronômico." },
          { name: "Taubaté", metric: "Concentração estudantil e forte cultura de lanches artesanais." },
          { name: "Limeira", metric: "Indústria forte e demanda por cardápios eficientes de lanche rápido." },
          { name: "Praia Grande", metric: "Alta demanda sazonal de turismo com alto volume de delivery." },
          { name: "Indaiatuba", metric: "Altíssimo IDH e população receptiva a novidades tecnológicas." }
        ]
      },
      {
        state: "Rio de Janeiro",
        uf: "RJ",
        cities: [
          { name: "Rio de Janeiro", metric: "Mercado turístico e residencial imenso, forte em delivery." },
          { name: "Niterói", metric: "IDH muito alto, público exigente, grande densidade gastronômica." },
          { name: "Duque de Caxias", metric: "Grande densidade populacional na Baixada Fluminense." },
          { name: "Nova Iguaçu", metric: "Polo comercial da baixada com expansão fantástica de lanches." },
          { name: "São Gonçalo", metric: "Segunda maior população do estado, demanda de varejo popular." },
          { name: "Petrópolis", metric: "Região serrana, público turístico de alta renda." },
          { name: "Campos dos Goytacazes", metric: "Maior cidade do interior e polo universitário." },
          { name: "Volta Redonda", metric: "Cidade industrial próspera no Sul Fluminense." },
          { name: "Macaé", metric: "Capital nacional do petróleo, ticket médio alto de alimentação." },
          { name: "Cabo Frio", metric: "Litoral turístico robusto com alto giro de restaurantes na temporada." },
          { name: "Teresópolis", metric: "Cidade serrana com ótimo circuito gastronômico e pizzarias." },
          { name: "Nova Friburgo", metric: "Polo industrial de moda e forte consumo de alimentos gourmet." },
          { name: "Barra Mansa", metric: "Comércio dinâmico e ótima oportunidade de automação." },
          { name: "Angra dos Reis", metric: "Região litorânea nobre com excelente potencial de pizzarias." },
          { name: "Resende", metric: "Polo automotivo em crescimento no vale do Paraíba." },
          { name: "Araruama", metric: "Litoral em crescimento, excelente para expansão de delivery de bairro." },
          { name: "Itaboraí", metric: "Região metropolitana com comércio local se digitalizando." },
          { name: "Maricá", metric: "Altos royalties e investimento social impulsionando consumo." },
          { name: "Rio das Ostras", metric: "Alta atração de novos moradores e forte consumo noturno." },
          { name: "Tanguá", metric: "Comércio local emergente ideal para automação de restaurantes." }
        ]
      }
    ];
    
    const randomFallback = fallbackStates[Math.floor(Math.random() * fallbackStates.length)];
    res.json(randomFallback);
  }
});

export default router
