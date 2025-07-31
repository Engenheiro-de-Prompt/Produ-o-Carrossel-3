import React, { useState } from 'react';
import type { AppSettings, GenerationSettings, VisualSettings, ApiProvider } from '../types';
import { SlidePreview } from './SlidePreview';
import { FONT_OPTIONS, GEMINI_TEXT_MODELS, GEMINI_IMAGE_MODELS, OPENAI_TEXT_MODELS, OPENAI_IMAGE_MODELS, GEMINI_SUPPORTED_ASPECT_RATIOS, OPENAI_SUPPORTED_ASPECT_RATIOS } from '../constants';
import { findClosestSupportedRatio } from '../utils';


interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSettingsChange }) => {
  const [activeTab, setActiveTab] = useState<'visual' | 'generation'>('visual');

  if (!isOpen) return null;

  const handleVisualSettingChange = <K extends keyof VisualSettings, SK extends keyof VisualSettings[K]>(
    category: K,
    key: SK,
    value: VisualSettings[K][SK]
  ) => {
    onSettingsChange({
      ...settings,
      visual: {
        ...settings.visual,
        [category]: {
            ...settings.visual[category],
            [key]: value,
        },
      }
    });
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
  
  const sampleSlide = { id: 1, text: "Este é um título de exemplo\nE esta é a descrição do seu **slide** para que você possa ver o ++resultado++ em tempo real.", background: settings.visual.colors.slideBGDark };
  const sampleImageSlide = { ...sampleSlide, background: 'data:image/jpeg;base64,'}; // Dummy B64 to trigger image mode
  
  const { apiProvider } = settings.generation;
  const textModels = apiProvider === 'gemini' ? GEMINI_TEXT_MODELS : OPENAI_TEXT_MODELS;
  const imageModels = apiProvider === 'gemini' ? GEMINI_IMAGE_MODELS : OPENAI_IMAGE_MODELS;
  const supportedAspectRatios = apiProvider === 'gemini' ? GEMINI_SUPPORTED_ASPECT_RATIOS : OPENAI_SUPPORTED_ASPECT_RATIOS;

  const actualAspectRatio = findClosestSupportedRatio(settings.generation.aspectRatio, supportedAspectRatios);
  const previewAspectRatioStyle: React.CSSProperties = {
      aspectRatio: actualAspectRatio.replace(':', ' / '),
  };


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-800">Configurações</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800 text-3xl leading-none">&times;</button>
        </div>
        
        <div className="border-b border-slate-200 px-6">
            <nav className="-mb-px flex space-x-6">
                <button onClick={() => setActiveTab('visual')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'visual' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                    Identidade Visual
                </button>
                 <button onClick={() => setActiveTab('generation')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'generation' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                    Geração (IA)
                </button>
            </nav>
        </div>

        <div className="flex-1 flex overflow-hidden">
            {/* Settings Panel */}
            <div className="w-1/2 p-6 space-y-6 overflow-y-auto">
                {activeTab === 'visual' && (
                    <>
                        <div className="space-y-4 p-4 border rounded-lg">
                            <h3 className="text-lg font-semibold text-slate-700">Tipografia</h3>
                            <div>
                                <label className="block text-sm font-medium text-slate-600">Fonte</label>
                                <select value={settings.visual.typography.fontFamily} onChange={e => handleVisualSettingChange('typography', 'fontFamily', e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                                    {FONT_OPTIONS.map(font => <option key={font.value} value={font.value} style={{fontFamily: font.value}}>{font.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-600">Tam. Título (px)</label>
                                    <input type="number" value={settings.visual.typography.titleFontSize} onChange={e => handleVisualSettingChange('typography', 'titleFontSize', Number(e.target.value))} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600">Tam. Descrição (px)</label>
                                    <input type="number" value={settings.visual.typography.descriptionFontSize} onChange={e => handleVisualSettingChange('typography', 'descriptionFontSize', Number(e.target.value))} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"/>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 p-4 border rounded-lg">
                            <h3 className="text-lg font-semibold text-slate-700">Cores</h3>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                                <div className="flex items-center justify-between"><label className="text-sm font-medium text-slate-600">Texto (Claro)</label><input type="color" value={settings.visual.colors.textLight} onChange={e => handleVisualSettingChange('colors', 'textLight', e.target.value)} className="w-8 h-8 rounded border-slate-300"/></div>
                                <div className="flex items-center justify-between"><label className="text-sm font-medium text-slate-600">Texto (Escuro)</label><input type="color" value={settings.visual.colors.textDark} onChange={e => handleVisualSettingChange('colors', 'textDark', e.target.value)} className="w-8 h-8 rounded border-slate-300"/></div>
                                <div className="flex items-center justify-between"><label className="text-sm font-medium text-slate-600">Destaque</label><input type="color" value={settings.visual.colors.highlight} onChange={e => handleVisualSettingChange('colors', 'highlight', e.target.value)} className="w-8 h-8 rounded border-slate-300"/></div>
                                <div className="flex items-center justify-between"><label className="text-sm font-medium text-slate-600">Fundo (Claro)</label><input type="color" value={settings.visual.colors.slideBGLight} onChange={e => handleVisualSettingChange('colors', 'slideBGLight', e.target.value)} className="w-8 h-8 rounded border-slate-300"/></div>
                                <div className="flex items-center justify-between"><label className="text-sm font-medium text-slate-600">Fundo (Escuro)</label><input type="color" value={settings.visual.colors.slideBGDark} onChange={e => handleVisualSettingChange('colors', 'slideBGDark', e.target.value)} className="w-8 h-8 rounded border-slate-300"/></div>
                                <div className="flex items-center justify-between"><label className="text-sm font-medium text-slate-600">Fundo (Acento)</label><input type="color" value={settings.visual.colors.slideBGAccent} onChange={e => handleVisualSettingChange('colors', 'slideBGAccent', e.target.value)} className="w-8 h-8 rounded border-slate-300"/></div>
                            </div>
                        </div>

                         <div className="space-y-4 p-4 border rounded-lg">
                            <h3 className="text-lg font-semibold text-slate-700">Overlay da Imagem</h3>
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-slate-600">Cor do Overlay</label>
                                <input type="color" value={settings.visual.colors.overlayColor} onChange={e => handleVisualSettingChange('colors', 'overlayColor', e.target.value)} className="w-8 h-8 rounded border-slate-300"/>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-slate-600">Opacidade do Overlay ({Math.round(settings.visual.style.overlayOpacity * 100)}%)</label>
                                <input type="range" min="0" max="1" step="0.01" value={settings.visual.style.overlayOpacity} onChange={e => handleVisualSettingChange('style', 'overlayOpacity', Number(e.target.value))} className="mt-1 w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"/>
                            </div>
                        </div>
                    </>
                )}
                {activeTab === 'generation' && (
                   <div className="space-y-4">
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
                            <p className="mt-1 text-xs text-slate-500">
                                Formato suportado mais próximo: <span className="font-semibold">{findClosestSupportedRatio(settings.generation.aspectRatio, supportedAspectRatios)}</span>
                            </p>
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
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600">Prompt dos Slides</label>
                            <textarea value={settings.generation.slidePrompt} onChange={e => handleGenerationSettingChange('slidePrompt', e.target.value)} rows={8} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm font-mono text-xs" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-600">Prompt da Imagem</label>
                            <textarea value={settings.generation.imagePrompt} onChange={e => handleGenerationSettingChange('imagePrompt', e.target.value)} rows={8} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm font-mono text-xs" />
                        </div>
                    </div>
                )}
            </div>

            {/* Preview Panel */}
            <div className="w-1/2 p-6 bg-slate-100 flex flex-col items-center justify-center border-l border-slate-200">
                 <h3 className="text-lg font-semibold text-slate-700 mb-4">
                     Preview em Tempo Real
                 </h3>
                 <div className="w-full max-w-sm shadow-lg rounded-lg overflow-hidden" style={previewAspectRatioStyle}>
                    <SlidePreview slide={activeTab === 'visual' && settings.visual.style.overlayOpacity > 0 ? sampleImageSlide : sampleSlide} settings={settings.visual} totalSlides={7}/>
                 </div>
                 {activeTab === 'generation' && (
                     <p className="text-center text-xs text-slate-500 mt-4 max-w-sm">O preview reflete as configurações de 'Identidade Visual'. Mudanças no provedor, modelos ou prompts serão aplicadas na próxima geração de carrossel.</p>
                 )}
            </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 text-right">
          <button onClick={onClose} className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-sm hover:bg-indigo-700">
            Concluído
          </button>
        </div>
      </div>
    </div>
  );
};