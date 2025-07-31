import type { AppSettings, AspectRatio } from './types';

export const NEW_SLIDE_GENERATION_PROMPT = `Sua missão é criar o texto para 7 slides de um carrossel a partir de um artigo.

**REGRAS ABSOLUTAS E INQUEBRÁVEIS:**
1.  **NUNCA** inclua títulos como "SLIDE 1", "🔹 SLIDE 1", ou qualquer comentário. Sua resposta deve ser **APENAS** o texto bruto dos slides.
2.  Use "---SLIDE_BREAK---" como o único separador entre os slides.
3.  A primeira linha de cada slide é o TÍTULO, e deve ser curta e impactante. O resto do texto é a DESCRIÇÃO. Use quebras de linha para organizar o conteúdo de forma clara e arejada, com um máximo de 300 caracteres por slide.

**REGRAS DE FORMATAÇÃO E DESTAQUE:**
- **Destaque Colorido (++palavra++):** Use este formato com **MUITA MODERAÇÃO**. Aplique-o apenas a **UMA** palavra ou pequena frase por slide que represente a ideia mais impactante.
- **Destaque Normal (**palavra**):** Use este formato para dar ênfase a termos importantes ou para estruturar a informação dentro do slide.

**ESTRUTURA DOS SLIDES:**
Adapte o artigo a esta jornada de narrativa:

SLIDE 1 (Capa): Um gancho forte. Uma frase ousada ou pergunta que desperte curiosidade.
SLIDE 2 (Problema): Descreva a dor principal que o público-alvo enfrenta.
SLIDE 3 (Custo Oculto): Mostre as consequências negativas de não resolver o problema.
SLIDE 4 (A Solução): Apresente a solução de forma clara.
SLIDE 5 (Prova/Benefício): Apresente um resultado tangível ou um benefício claro.
SLIDE 6 (Bônus/Diferencial): Apresente um recurso extra ou um insight avançado.
SLIDE 7 (CTA): Uma chamada para ação clara e direta. Diga ao leitor o que fazer a seguir.`;


export const NEW_IMAGE_GENERATION_PROMPT = `Imagem altamente simbólica e emblemática no formato especificado, com um único símbolo de destaque dentro de um vazio absoluto. Composição em preto e branco com iluminação premiada e temática cyberpunk. O gancho visual deve ser relacionado à tese principal: [TESE_PRINCIPAL]. No vazio absoluto, um só símbolo emerge.
Silhueta isolada entre luz e sombra — ora luz sobre trevas, ora trevas sobre luz.
Escolha é sorte, não razão: uma forma arquetípica se revela.
Talvez seja o tempo escoando em silêncio da ampulheta.
Ou o gelo oculto sob a superfície.
Ou nuvens que sussurram dados ao vento.
Ou um autômato sonhando circuitos.
Nada mais.
Nenhum ruído.
A imagem se cala para que o símbolo fale.
E tudo ao redor desaparece.`;

export const LAST_SLIDE_IMAGE_GENERATION_PROMPT = `Imagem altamente simbólica para uma conclusão ou chamada para ação, no formato especificado. Foco claro em um caminho adiante ou um destino alcançado. Composição em preto e branco, iluminação premiada, temática cyberpunk com um tom de clareza. O gancho visual deve estar relacionado à tese principal: [TESE_PRINCIPAL]. A imagem deve evocar um sentimento de 'próximo passo', como um caminho iluminado no vazio ou uma porta se abrindo para a luz. Simplicidade e clareza são essenciais.`;

export const THESIS_EXTRACTION_PROMPT = `Resuma a tese principal do seguinte artigo em uma frase curta e impactante para servir de base para uma imagem conceitual. Responda apenas com a frase.

ARTIGO:
{ARTICLE_TEXT}
`;

export const GEMINI_TEXT_MODELS = ['gemini-2.5-flash'];
export const GEMINI_IMAGE_MODELS = ['imagen-3.0-generate-002'];

export const OPENAI_TEXT_MODELS = ['gpt-4.1-mini-2025-04-14'];
export const OPENAI_IMAGE_MODELS = ['dall-e-3'];

export const GEMINI_SUPPORTED_ASPECT_RATIOS: ReadonlyArray<AspectRatio> = ['1:1', '9:16', '16:9', '4:3', '3:4', '4:5'];
export const OPENAI_SUPPORTED_ASPECT_RATIOS: ReadonlyArray<AspectRatio> = ['1:1', '16:9', '9:16'];

export const FONT_OPTIONS = [
    { name: 'Inter', value: 'Inter, sans-serif' },
    { name: 'Lato', value: 'Lato, sans-serif' },
    { name: 'Montserrat', value: 'Montserrat, sans-serif' },
    { name: 'Poppins', value: 'Poppins, sans-serif' },
    { name: 'Playfair Display', value: "'Playfair Display', serif" },
    { name: 'Cormorant Garamond', value: "'Cormorant Garamond', serif" },
];

export const DEFAULT_APP_SETTINGS: AppSettings = {
  generation: {
    apiProvider: 'openai',
    textModel: 'gpt-4.1-mini-2025-04-14',
    imageModel: 'dall-e-3',
    aspectRatio: '4:5',
    slidePrompt: NEW_SLIDE_GENERATION_PROMPT,
    imagePrompt: NEW_IMAGE_GENERATION_PROMPT,
  },
  visual: {
    typography: {
      fontFamily: 'Inter, sans-serif',
      titleFontSize: 32,
      descriptionFontSize: 18,
      lineSpacing: 1.5,
    },
    colors: {
      textLight: '#FFFFFF',
      textDark: '#000000',
      highlight: '#F97316', // Orange
      slideBGLight: '#FFFFFF',
      slideBGDark: '#000000',
      slideBGAccent: '#F3F4F6', // A neutral light gray
      overlayColor: '#000000',
    },
    style: {
      textAlignment: 'center',
      margin: 60,
      overlayOpacity: 0.3,
    },
  }
};