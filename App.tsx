
import React, { useState, useCallback, useEffect } from 'react';
import { HomePage } from './components/HomePage';
import { LoadingPage } from './components/LoadingPage';
import { EditorPage } from './components/EditorPage';
import { generateCarouselContent, regenerateImage } from './services/aiService';
import type { Slide, AppSettings } from './types';
import { DEFAULT_APP_SETTINGS, FONT_OPTIONS } from './constants';
import { useLocalStorage } from './hooks/useLocalStorage';

type View = 'home' | 'loading' | 'editor';

const App: React.FC = () => {
  const [view, setView] = useState<View>('home');
  const [loadingMessage, setLoadingMessage] = useState<string>('Iniciando o processo...');
  const [slides, setSlides] = useState<Slide[]>([]);
  const [originalArticle, setOriginalArticle] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [geminiApiKey, setGeminiApiKey] = useLocalStorage<string>('gemini-api-key', '');
  const [openaiApiKey, setOpenaiApiKey] = useLocalStorage<string>('openai-api-key', '');
  const [settings, setSettings] = useLocalStorage<AppSettings>('carousel-settings', DEFAULT_APP_SETTINGS);

  useEffect(() => {
    const loadFonts = async () => {
      try {
        const fontFamilies = FONT_OPTIONS.map(font => {
          const familyName = font.name.replace(/ /g, '+');
          return `family=${familyName}:wght@400;700`;
        }).join('&');
        
        const fontUrl = `https://fonts.googleapis.com/css2?${fontFamilies}&display=swap`;
        
        const response = await fetch(fontUrl);
        if (!response.ok) {
          throw new Error('Failed to fetch font CSS');
        }
        const cssText = await response.text();
        
        const style = document.createElement('style');
        style.textContent = cssText;
        document.head.appendChild(style);
      } catch (error) {
        console.error("Error loading Google Fonts:", error);
      }
    };

    loadFonts();
  }, []);

  const handleSettingsChange = (newSettings: AppSettings) => {
    setSettings(newSettings);
  };


  const handleCreateCarousel = useCallback(async (articleText: string) => {
    const { apiProvider } = settings.generation;
    const apiKey = apiProvider === 'gemini' ? geminiApiKey : openaiApiKey;
    
    if (!apiKey) {
      const providerName = apiProvider === 'gemini' ? 'Google Gemini' : 'OpenAI';
      setError(`Por favor, insira sua Chave de API da ${providerName} para continuar.`);
      return;
    }
    setError(null);
    setView('loading');
    setOriginalArticle(articleText);
    setLoadingMessage('Configurando o assistente de IA...');

    try {
      const result = await generateCarouselContent(articleText, apiKey, settings.generation, (message) => {
        setLoadingMessage(message);
      });

      const generatedSlides: Slide[] = result.slides.map((slideData, index) => {
        const slideNumber = index + 1;
        const totalSlides = result.slides.length;
        let background = settings.visual.colors.slideBGLight;

        if (slideNumber === 1) {
            background = `data:image/jpeg;base64,${result.backgroundImage1}`;
        } else if (slideNumber === totalSlides) {
            background = `data:image/jpeg;base64,${result.backgroundImageLast}`;
        } else if (slideNumber % 2 === 0) {
            background = settings.visual.colors.slideBGDark;
        }

        return {
          id: slideNumber,
          text: slideData.text,
          background: background,
        };
      });

      setSlides(generatedSlides);
      setView('editor');
    } catch (e) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : 'Ocorreu um erro desconhecido.';
      setError(`Falha ao gerar conteúdo: ${errorMessage}. Verifique suas configurações, chave de API e a conexão.`);
      setView('home');
    }
  }, [geminiApiKey, openaiApiKey, settings]);

  const handleCreateNew = () => {
    setSlides([]);
    setError(null);
    setOriginalArticle('');
    setView('home');
  };
  
  const handleUpdateSlideText = (slideId: number, newText: string) => {
    setSlides(prevSlides => 
      prevSlides.map(slide => 
        slide.id === slideId ? { ...slide, text: newText } : slide
      )
    );
  };

  const handleRegenerateImage = async (slideId: number) => {
      const { apiProvider } = settings.generation;
      const apiKey = apiProvider === 'gemini' ? geminiApiKey : openaiApiKey;

      if (!apiKey) {
          const providerName = apiProvider === 'gemini' ? 'Google Gemini' : 'OpenAI';
          alert(`A chave de API da ${providerName} é necessária para gerar uma nova imagem.`);
          return;
      }
      
      const isFirstSlide = slideId === 1;
      const isLastSlide = slideId === slides.length;

      if (!isFirstSlide && !isLastSlide) return;
      
      const slideRef = slides.find(s => s.id === slideId);
      const sourceText = slideRef?.text || originalArticle;
      
      if (!sourceText) {
          alert("Não há texto de referência para gerar a imagem.");
          return;
      }

      const originalBackground = slideRef.background;
      setSlides(prev => prev.map(s => (s.id === slideId) ? {...s, background: 'loading'} : s));

      try {
        const newImageB64 = await regenerateImage(sourceText, apiKey, settings.generation, slideId, slides.length);
        const newImageBackground = `data:image/jpeg;base64,${newImageB64}`;
        setSlides(prev => prev.map(s => (s.id === slideId) ? {...s, background: newImageBackground} : s));
      } catch (e) {
        console.error(e);
        alert("Falha ao gerar nova imagem. Restaurando a imagem anterior.");
        setSlides(prev => prev.map(s => (s.id === slideId) ? {...s, background: originalBackground} : s));
      }
  };

  const renderContent = () => {
    switch (view) {
      case 'loading':
        return <LoadingPage message={loadingMessage} />;
      case 'editor':
        return (
          <EditorPage
            initialSlides={slides}
            initialSettings={settings}
            onBack={handleCreateNew}
          />
        );
      case 'home':
      default:
        return (
          <HomePage
            onGenerate={handleCreateCarousel}
            geminiApiKey={geminiApiKey}
            onGeminiApiKeyChange={setGeminiApiKey}
            openaiApiKey={openaiApiKey}
            onOpenaiApiKeyChange={setOpenaiApiKey}
            error={error}
            settings={settings}
            onSettingsChange={handleSettingsChange}
          />
        );
    }
  };

  return (
    <main className="bg-slate-50 text-slate-900 min-h-screen antialiased">
      {renderContent()}
    </main>
  );
};

export default App;
