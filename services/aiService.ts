
import { GoogleGenAI } from "@google/genai";
import { THESIS_EXTRACTION_PROMPT, LAST_SLIDE_IMAGE_GENERATION_PROMPT, GEMINI_SUPPORTED_ASPECT_RATIOS, OPENAI_SUPPORTED_ASPECT_RATIOS } from '../constants';
import type { GenerationSettings, AspectRatio } from "../types";
import { findClosestSupportedRatio, cropImage } from '../utils';

interface SlideData {
  slideNumber: number;
  text: string;
}

interface GenerationResult {
  slides: SlideData[];
  backgroundImage1: string;
  backgroundImageLast: string;
}

// --- Helper Functions ---

const mapAspectRatioToOpenAISize = (aspectRatio: AspectRatio): '1024x1024' | '1792x1024' | '1024x1792' => {
  switch (aspectRatio) {
    case '16:9': return '1792x1024';
    case '9:16': return '1024x1792';
    case '1:1':
    default: return '1024x1024';
  }
};

const callOpenAIImageAPI = async (prompt: string, apiKey: string, settings: GenerationSettings): Promise<string> => {
    const needsCropping = settings.aspectRatio === '4:5';
    
    const sizeToRequest = needsCropping 
      ? '1024x1024' 
      : mapAspectRatioToOpenAISize(findClosestSupportedRatio(settings.aspectRatio, OPENAI_SUPPORTED_ASPECT_RATIOS));
    
    const finalPrompt = needsCropping
      ? `${prompt}\n\nIMPORTANT: This image will be vertically cropped to a 4:5 aspect ratio. Please compose the image with the main subject in the center, leaving ample space at the top and bottom to allow for cropping.`
      : prompt;
      
    const imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
        model: settings.imageModel,
        prompt: finalPrompt,
        n: 1,
        size: sizeToRequest,
        response_format: 'b64_json',
        }),
    });
    if (!imageResponse.ok) throw new Error(`OpenAI Image API Error: ${await imageResponse.text()}`);
    const imageData = await imageResponse.json();
    const base64ImageBytes = imageData.data[0]?.b64_json;
    if (!base64ImageBytes) throw new Error("Falha ao gerar a imagem com DALL-E 3.");
    
    if (needsCropping) {
        const fullDataUrl = `data:image/jpeg;base64,${base64ImageBytes}`;
        const croppedB64 = await cropImage(fullDataUrl, '4:5');
        return croppedB64;
    }
    
    return base64ImageBytes;
}

const callGeminiImageAPI = async (prompt: string, apiKey: string, settings: GenerationSettings): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey });
    const actualAspectRatio = findClosestSupportedRatio(settings.aspectRatio, GEMINI_SUPPORTED_ASPECT_RATIOS);
    const imageResponse = await ai.models.generateImages({
        model: settings.imageModel,
        prompt: prompt,
        config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: actualAspectRatio as any },
    });
    const base64ImageBytes = imageResponse.generatedImages[0]?.image?.imageBytes;
    if (!base64ImageBytes) throw new Error("Falha ao gerar a imagem com Gemini.");
    return base64ImageBytes;
}


// --- OpenAI Implementation ---

const generateWithOpenAI = async (
  articleText: string,
  apiKey: string,
  settings: GenerationSettings,
  onProgress: (message: string) => void
): Promise<GenerationResult> => {
  onProgress("Analisando a tese principal do artigo com OpenAI...");
  const openAIApiUrl = 'https://api.openai.com/v1/chat/completions';
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` };

  const thesisPrompt = THESIS_EXTRACTION_PROMPT.replace('{ARTICLE_TEXT}', articleText);
  const thesisResponse = await fetch(openAIApiUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ model: settings.textModel, messages: [{ role: 'user', content: thesisPrompt }], temperature: 0.5 }),
  });
  if (!thesisResponse.ok) throw new Error(`OpenAI API Error (Thesis): ${await thesisResponse.text()}`);
  const thesisData = await thesisResponse.json();
  const thesis = thesisData.choices[0]?.message?.content?.trim();
  if (!thesis) throw new Error("Não foi possível extrair a tese do artigo com OpenAI.");

  onProgress("Analisando o artigo e criando a copy com OpenAI...");
  const slideGenPrompt = `${settings.slidePrompt}\n\n---\n\nAnalise o seguinte artigo:\n\n${articleText}`;
  const textResponse = await fetch(openAIApiUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ model: settings.textModel, messages: [{ role: 'user', content: slideGenPrompt }] }),
  });
  if (!textResponse.ok) throw new Error(`OpenAI API Error (Text): ${await textResponse.text()}`);
  const textData = await textResponse.json();
  const rawText = textData.choices[0]?.message?.content;
  if (!rawText) throw new Error("A API da OpenAI não retornou conteúdo de texto.");

  const slideTexts = rawText.split('---SLIDE_BREAK---').map((t: string) => t.trim()).filter(Boolean);
  if (slideTexts.length === 0) throw new Error("A resposta da API não continha separadores de slide válidos.");
  const slides: SlideData[] = slideTexts.map((text: string, index: number) => ({ slideNumber: index + 1, text }));

  onProgress("Gerando imagem de capa com DALL-E 3...");
  const image1Prompt = settings.imagePrompt.replace('[TESE_PRINCIPAL]', thesis);
  const image1B64 = await callOpenAIImageAPI(image1Prompt, apiKey, settings);
  
  onProgress("Gerando imagem de conclusão com DALL-E 3...");
  const imageLastPrompt = LAST_SLIDE_IMAGE_GENERATION_PROMPT.replace('[TESE_PRINCIPAL]', thesis);
  const imageLastB64 = await callOpenAIImageAPI(imageLastPrompt, apiKey, settings);

  onProgress("Montando seu carrossel...");
  return { slides: slides.sort((a, b) => a.slideNumber - b.slideNumber), backgroundImage1: image1B64, backgroundImageLast: imageLastB64 };
};

// --- Gemini Implementation ---

const generateWithGemini = async (
  articleText: string,
  apiKey: string,
  settings: GenerationSettings,
  onProgress: (message: string) => void
): Promise<GenerationResult> => {
  const ai = new GoogleGenAI({ apiKey });

  onProgress("Analisando a tese principal do artigo com Gemini...");
  const thesisPrompt = THESIS_EXTRACTION_PROMPT.replace('{ARTICLE_TEXT}', articleText);
  const thesisResponse = await ai.models.generateContent({ model: settings.textModel, contents: thesisPrompt, config: { temperature: 0.5 } });
  const thesis = thesisResponse.text;
  if (!thesis) throw new Error("Não foi possível extrair a tese do artigo com Gemini.");

  onProgress("Analisando o artigo e criando a copy com Gemini...");
  const slideGenPrompt = `${settings.slidePrompt}\n\n---\n\nAnalise o seguinte artigo:\n\n${articleText}`;
  const textResponse = await ai.models.generateContent({ model: settings.textModel, contents: slideGenPrompt });
  if (!textResponse.text) throw new Error("A API Gemini não retornou conteúdo de texto.");
  
  const slideTexts = textResponse.text.split('---SLIDE_BREAK---').map(t => t.trim()).filter(Boolean);
  if (slideTexts.length === 0) throw new Error("A resposta da API não continha separadores de slide válidos.");
  const slides: SlideData[] = slideTexts.map((text, index) => ({ slideNumber: index + 1, text }));

  onProgress("Gerando imagem de capa com Gemini...");
  const image1Prompt = settings.imagePrompt.replace('[TESE_PRINCIPAL]', thesis);
  const image1B64 = await callGeminiImageAPI(image1Prompt, apiKey, settings);

  onProgress("Gerando imagem de conclusão com Gemini...");
  const imageLastPrompt = LAST_SLIDE_IMAGE_GENERATION_PROMPT.replace('[TESE_PRINCIPAL]', thesis);
  const imageLastB64 = await callGeminiImageAPI(imageLastPrompt, apiKey, settings);

  onProgress("Montando seu carrossel...");
  return { slides: slides.sort((a, b) => a.slideNumber - b.slideNumber), backgroundImage1: image1B64, backgroundImageLast: imageLastB64 };
};

// --- Public API ---

export const generateCarouselContent = async (
  articleText: string,
  apiKey: string,
  settings: GenerationSettings,
  onProgress: (message: string) => void
): Promise<GenerationResult> => {
  if (!apiKey) throw new Error("API Key not provided.");
  if (settings.apiProvider === 'openai') {
    return generateWithOpenAI(articleText, apiKey, settings, onProgress);
  }
  return generateWithGemini(articleText, apiKey, settings, onProgress);
};

export const regenerateImage = async (
  sourceText: string,
  apiKey: string,
  settings: GenerationSettings,
  slideId: number,
  totalSlides: number
): Promise<string> => {
  if (!apiKey) throw new Error("API Key not provided.");
  
  const isLastSlide = slideId === totalSlides;
  const imageBasePrompt = isLastSlide ? LAST_SLIDE_IMAGE_GENERATION_PROMPT : settings.imagePrompt;

  // Unified thesis extraction step
  let thesis = '';
  const thesisPrompt = THESIS_EXTRACTION_PROMPT.replace('{ARTICLE_TEXT}', sourceText);
  if (settings.apiProvider === 'openai') {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model: settings.textModel, messages: [{ role: 'user', content: thesisPrompt }], temperature: 0.5 }),
    });
    if (!response.ok) throw new Error(`OpenAI API Error (Thesis): ${await response.text()}`);
    const data = await response.json();
    thesis = data.choices[0]?.message?.content?.trim();
  } else {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({ model: settings.textModel, contents: thesisPrompt, config: { temperature: 0.5 } });
    thesis = response.text;
  }
  if (!thesis) throw new Error("Não foi possível extrair a tese do texto fornecido.");

  // Unified image generation step
  const finalImagePrompt = imageBasePrompt.replace('[TESE_PRINCIPAL]', thesis);
  if (settings.apiProvider === 'openai') {
    return callOpenAIImageAPI(finalImagePrompt, apiKey, settings);
  } else {
    return callGeminiImageAPI(finalImagePrompt, apiKey, settings);
  }
};
