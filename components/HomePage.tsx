
import React, { useState } from 'react';
import { FileTextIcon, SparklesIcon, SettingsIcon } from './icons';
import type { AppSettings, GenerationSettings, ApiProvider } from '../types';
import { GEMINI_TEXT_MODELS, GEMINI_IMAGE_MODELS, OPENAI_TEXT_MODELS, OPENAI_IMAGE_MODELS, GEMINI_SUPPORTED_ASPECT_RATIOS, OPENAI_SUPPORTED_ASPECT_RATIOS } from '../constants';
import { findClosestSupportedRatio } from '../utils';


interface HomePageProps {
  onGenerate: (articleText: string) => void;
  geminiApiKey: string;
  onGeminiApiKeyChange: (key: string) => void;
  openaiApiKey: string;
  onOpenaiApiKeyChange: (key: string) => void;
  error: string | null;
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onGenerate, geminiApiKey, onGeminiApiKeyChange, openaiApiKey, onOpenaiApiKeyChange, error, settings, onSettingsChange }) => {
  const [articleText, setArticleText] = useState('');
  const [isKeySectionVisible, setIsKeySectionVisible] = useState(!geminiApiKey && !openaiApiKey);
  const [isAdvancedVisible, setIsAdvancedVisible] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (articleText.trim()) {
      onGenerate(articleText);
    }
  };
  
  const handleProviderChange = (newProvider: ApiProvider) => {
    const isGemini = newProvider === 'gemini';
    onSettingsChange({
        ...settings,
        generation: {
            ...settings.generation,
            apiProvider: newProvider,
            textModel: isGemini ? GEMINI_TEXT_MODELS[0] : OPENAI_TEXT_MODELS[0],
            imageModel: isGemini ? GEMINI_IMAGE_MODELS[0] : OPENAI_IMAGE_MODELS[0],
        }
    });
  };

  const handleGenerationSettingChange = <K extends keyof GenerationSettings>(
    key: K,
    value: GenerationSettings[K]
  ) => {
    if (key === 'apiProvider') {
        handleProviderChange(value as ApiProvider);
    } else {
        onSettingsChange({
          ...settings,
          generation: {
            ...settings.generation,
            [key]: value,
          },
        });
    }
  };
  
  const { apiProvider } = settings.generation;
  const textModels = apiProvider === 'gemini' ? GEMINI_TEXT_MODELS : OPENAI_TEXT_MODELS;
  const imageModels = apiProvider === 'gemini' ? GEMINI_IMAGE_MODELS : OPENAI_IMAGE_MODELS;
  const supportedAspectRatios = apiProvider === 'gemini' ? GEMINI_SUPPORTED_ASPECT_RATIOS : OPENAI_SUPPORTED_ASPECT_RATIOS;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-3xl text-center">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-800">
          Transforme Texto em <span className="text-indigo-600">Carrosséis Mágicos</span>
        </h1>
        <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
          Cole seu artigo, insight ou qualquer texto abaixo e deixe a nossa IA criar um carrossel de slides visualmente atraente e pronto para postar.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-3xl mt-10">
        <div className="relative">
          <FileTextIcon className="absolute top-6 left-6 w-8 h-8 text-slate-400" />
          <textarea
            value={articleText}
            onChange={(e) => setArticleText(e.target.value)}
            placeholder="Cole seu artigo ou texto aqui..."
            className="w-full h-64 p-6 pl-16 text-base text-slate-700 bg-white border-2 border-dashed border-slate-300 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 transition-all duration-300 resize-none"
            required
          ></textarea>
        </div>
        
        <div className="mt-6 bg-white p-4 rounded-lg border border-slate-200">
             {isKeySectionVisible ? (
              <div>
                 <div className="flex border-b border-slate-200 mb-4">
                    <button type="button" onClick={() => handleProviderChange('gemini')} className={`flex-1 py-2 text-sm font-semibold text-center ${apiProvider === 'gemini' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`}>Google Gemini</button>
                    <button type="button" onClick={() => handleProviderChange('openai')} className={`flex-1 py-2 text-sm font-semibold text-center ${apiProvider === 'openai' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`}>OpenAI</button>
                </div>
                
                {apiProvider === 'gemini' ? (
                  <div>
                    <label htmlFor="gemini-api-key" className="block text-sm font-medium text-slate-700">Chave de API da Google Gemini</label>
                    <input id="gemini-api-key" type="password" value={geminiApiKey} onChange={(e) => onGeminiApiKeyChange(e.target.value)} placeholder="Cole sua chave Gemini aqui" className="mt-1 block w-full px-4 py-3 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                  </div>
                ) : (
                  <div>
                    <label htmlFor="openai-api-key" className="block text-sm font-medium text-slate-700">Chave de API da OpenAI</label>
                    <input id="openai-api-key" type="password" value={openaiApiKey} onChange={(e) => onOpenaiApiKeyChange(e.target.value)} placeholder="Cole sua chave OpenAI aqui (sk-...)" className="mt-1 block w-full px-4 py-3 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                  </div>
                )}
                <p className="mt-2 text-xs text-slate-500">
                  Sua chave é salva localmente. 
                  <button type="button" onClick={() => setIsKeySectionVisible(false)} className="ml-2 font-semibold text-indigo-600 hover:text-indigo-800">Esconder</button>
                </p>
              </div>
            ) : (
                <div className="text-center">
                     <button type="button" onClick={() => setIsKeySectionVisible(true)} className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
                        Editar Chaves de API
                    </button>
                </div>
            )}
        </div>
        
        <div className="mt-4">
            <button type="button" onClick={() => setIsAdvancedVisible(!isAdvancedVisible)} className="w-full flex justify-between items-center p-3 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-semibold">
                <span>Configurações Avançadas de Geração</span>
                <SettingsIcon className={`w-5 h-5 transition-transform ${isAdvancedVisible ? 'rotate-90' : ''}`} />
            </button>
            {isAdvancedVisible && (
                <div className="mt-2 p-4 bg-white border border-slate-200 rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-600">Provedor de IA</label>
                        <select value={apiProvider} onChange={e => handleGenerationSettingChange('apiProvider', e.target.value as any)} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                            <option value="gemini">Google Gemini</option>
                            <option value="openai">OpenAI</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600">Formato</label>
                         <select value={settings.generation.aspectRatio} onChange={e => handleGenerationSettingChange('aspectRatio', e.target.value as any)} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                            <option value="4:5">Vertical (4:5)</option>
                            <option value="1:1">Quadrado (1:1)</option>
                            <option value="9:16">Story (9:16)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600">Modelo de Texto</label>
                        <select value={settings.generation.textModel} onChange={e => handleGenerationSettingChange('textModel', e.target.value)} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                            {textModels.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600">Modelo de Imagem</label>
                        <select value={settings.generation.imageModel} onChange={e => handleGenerationSettingChange('imageModel', e.target.value)} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm">
                           {imageModels.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                         <p className="mt-1 text-xs text-slate-500">
                            Formato suportado mais próximo: <span className="font-semibold">{findClosestSupportedRatio(settings.generation.aspectRatio, supportedAspectRatios)}</span>
                        </p>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-600">Prompt dos Slides</label>
                        <textarea value={settings.generation.slidePrompt} onChange={e => handleGenerationSettingChange('slidePrompt', e.target.value)} rows={6} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm font-mono text-xs" />
                    </div>
                     <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-600">Prompt da Imagem</label>
                        <textarea value={settings.generation.imagePrompt} onChange={e => handleGenerationSettingChange('imagePrompt', e.target.value)} rows={6} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm font-mono text-xs" />
                    </div>
                </div>
            )}
        </div>


        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-300 text-red-800 rounded-lg">
            {error}
          </div>
        )}

        <div className="mt-8 text-center">
          <button
            type="submit"
            disabled={!articleText.trim()}
            className="inline-flex items-center justify-center px-12 py-4 font-bold text-white bg-indigo-600 rounded-full shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-300 disabled:bg-slate-400 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-300"
          >
            <SparklesIcon className="w-6 h-6 mr-3" />
            Criar Meu Carrossel
          </button>
        </div>
      </form>
    </div>
  );
};