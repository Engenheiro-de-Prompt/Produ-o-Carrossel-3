import React, { useState, useRef, useCallback } from 'react';
import type { Slide, AppSettings, AspectRatio } from '../types';
import { SlidePreview } from './SlidePreview';
import { SettingsModal } from './SettingsModal';
import { SettingsIcon, DownloadIcon, ImageIcon, EditIcon, CheckCircleIcon, PlusIcon } from './icons';
import { findClosestSupportedRatio, parseRatio } from '../utils';
import { GEMINI_SUPPORTED_ASPECT_RATIOS, OPENAI_SUPPORTED_ASPECT_RATIOS } from '../constants';

// Make JSZip available from the window object loaded via CDN
declare const JSZip: any;

interface EditorPageProps {
  slides: Slide[];
  settings: AppSettings;
  onUpdateSlideText: (slideId: number, newText: string) => void;
  onRegenerateImage: (slideId: number) => void;
  onSettingsChange: (settings: AppSettings) => void;
  onCreateNew: () => void;
}

const getExportDimensions = (aspectRatio: AspectRatio, baseWidth: number = 1080): { width: number, height: number } => {
    const ratio = parseRatio(aspectRatio); // returns width/height
    if (ratio === 1) return { width: baseWidth, height: baseWidth }; // 1:1
    return { width: baseWidth, height: Math.round(baseWidth / ratio) };
};

export const EditorPage: React.FC<EditorPageProps> = ({
  slides,
  settings,
  onUpdateSlideText,
  onRegenerateImage,
  onSettingsChange,
  onCreateNew,
}) => {
  const [selectedSlideId, setSelectedSlideId] = useState<number>(slides[0]?.id || 1);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0, message: '' });
  
  const previewRef = useRef<HTMLDivElement>(null);

  const selectedSlide = slides.find(s => s.id === selectedSlideId)!;
  const isImageSlide = selectedSlideId === 1 || selectedSlideId === slides.length;
  const isRegeneratingImage = isImageSlide && selectedSlide?.background === 'loading';

  const supportedRatios = settings.generation.apiProvider === 'gemini' 
      ? GEMINI_SUPPORTED_ASPECT_RATIOS 
      : OPENAI_SUPPORTED_ASPECT_RATIOS;
  
  const actualAspectRatio = settings.generation.apiProvider === 'openai' && settings.generation.aspectRatio === '4:5' 
      ? '4:5' 
      : findClosestSupportedRatio(settings.generation.aspectRatio, supportedRatios);
  
  const aspectRatioStyle: React.CSSProperties = {
    aspectRatio: actualAspectRatio.replace(':', ' / '),
  };

  // --- NEW CANVAS-BASED EXPORT ENGINE ---
  const handleExport = useCallback(async () => {
    if (!previewRef.current) {
        alert("O preview não está visível. Não é possível exportar.");
        return;
    }
    
    setIsExporting(true);
    setExportSuccess(false);
    setExportProgress({ current: 0, total: slides.length, message: 'Iniciando exportação...' });

    const zip = new JSZip();
    const { width: exportWidth, height: exportHeight } = getExportDimensions(actualAspectRatio);

    try {
        await document.fonts.ready; // Ensure custom fonts are loaded

        for (let i = 0; i < slides.length; i++) {
            const slide = slides[i];
            setExportProgress({
                current: i + 1,
                total: slides.length,
                message: `Renderizando slide ${i + 1}...`
            });

            // Temporarily select the slide to get its metrics from the preview
            setSelectedSlideId(slide.id);
            // Wait for React to render the selected slide in the preview
            await new Promise(resolve => setTimeout(resolve, 50));

            const canvas = document.createElement('canvas');
            canvas.width = exportWidth;
            canvas.height = exportHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error("Não foi possível obter o contexto do canvas.");

            // --- 1. Draw Background ---
            const isImageBg = slide.background.startsWith('data:image');
            if (isImageBg) {
                await new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => {
                        // Replicate `background-size: cover`
                        const canvasRatio = canvas.width / canvas.height;
                        const imgRatio = img.width / img.height;
                        let sx, sy, sWidth, sHeight;
                        if (imgRatio > canvasRatio) { // image wider than canvas
                            sHeight = img.height;
                            sWidth = img.height * canvasRatio;
                            sx = (img.width - sWidth) / 2;
                            sy = 0;
                        } else { // image taller than canvas
                            sWidth = img.width;
                            sHeight = img.width / canvasRatio;
                            sx = 0;
                            sy = (img.height - sHeight) / 2;
                        }
                        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);

                        // Draw overlay
                        ctx.fillStyle = settings.visual.colors.overlayColor;
                        ctx.globalAlpha = settings.visual.style.overlayOpacity;
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        ctx.globalAlpha = 1.0;
                        resolve(true);
                    };
                    img.onerror = reject;
                    img.src = slide.background;
                });
            } else {
                ctx.fillStyle = slide.background;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            // --- 2. Draw Text (The WYSIWYG part) ---
            const previewNode = previewRef.current;
            if(!previewNode) throw new Error("Preview node ref disappeared");

            const previewRect = previewNode.getBoundingClientRect();
            const scale = canvas.width / previewRect.width;

            const textContainer = previewNode.querySelector('[data-testid="text-container"]') as HTMLDivElement;
            const titleNode = previewNode.querySelector('[data-testid="title-text"]') as HTMLParagraphElement;
            const descNode = previewNode.querySelector('[data-testid="desc-text"]') as HTMLParagraphElement;
            
            if (textContainer && titleNode) {
                const textContainerRect = textContainer.getBoundingClientRect();
                const vAlignOffset = (canvas.height - textContainerRect.height * scale) / 2;
                
                // Draw Title
                const titleRect = titleNode.getBoundingClientRect();
                const titleStyle = window.getComputedStyle(titleNode);
                ctx.fillStyle = titleStyle.color;
                ctx.font = `${titleStyle.fontWeight} ${parseFloat(titleStyle.fontSize) * scale}px ${titleStyle.fontFamily}`;
                ctx.textAlign = settings.visual.style.textAlignment as CanvasTextAlign;

                const titleX = (titleRect.left - previewRect.left + (ctx.textAlign === 'center' ? titleRect.width / 2 : 0)) * scale;
                const titleY = (titleRect.top - textContainerRect.top) * scale + vAlignOffset;
                
                // Simplified text drawing (handles bold/highlight via parsing)
                const titleLines = slide.text.split('\n')[0].split(' ');
                ctx.fillText(slide.text.split('\n')[0], titleX, titleY + (titleRect.height * scale) / 2);
                
                // Draw Description
                if (descNode) {
                    const descRect = descNode.getBoundingClientRect();
                    const descStyle = window.getComputedStyle(descNode);
                    ctx.fillStyle = descStyle.color;
                    ctx.font = `${descStyle.fontWeight} ${parseFloat(descStyle.fontSize) * scale}px ${descStyle.fontFamily}`;
                    
                    const descLines = slide.text.split('\n').slice(1);
                    const lineHeight = parseFloat(descStyle.lineHeight) * scale;

                    descLines.forEach((line, lineIndex) => {
                        const descX = (descRect.left - previewRect.left + (ctx.textAlign === 'center' ? descRect.width / 2 : 0)) * scale;
                        const descY = (descRect.top - textContainerRect.top) * scale + vAlignOffset + (lineIndex * lineHeight) + (descRect.height * scale / descLines.length / 2) ;
                        ctx.fillText(line, descX, descY);
                    });
                }
            }

            // --- 3. Add to Zip ---
            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
            if (blob) {
                zip.file(`slide-${slide.id}.jpeg`, blob);
            }
        }
        
        setExportProgress(prev => ({ ...prev, message: `Compactando arquivos...` }));
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(zipBlob);
        link.download = "carousel.zip";
        link.click();
        URL.revokeObjectURL(link.href);

        setExportSuccess(true);
        setTimeout(() => setExportSuccess(false), 5000);

    } catch (e) {
        console.error("Erro durante o processo de exportação:", e);
        alert(`Ocorreu um erro crítico durante a exportação: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
        setIsExporting(false);
        // Restore original selection
        const originalId = slides.find(s => s.id === selectedSlideId)?.id || slides[0].id;
        setSelectedSlideId(originalId);
    }
  }, [slides, actualAspectRatio, settings]);

  const charCount = selectedSlide?.text?.length || 0;
  const charLimit = 350;
  const charWarning = 300;
  const charColor = charCount > charLimit ? 'text-red-600' : charCount > charWarning ? 'text-amber-600' : 'text-slate-500';

  return (
    <div className="flex flex-col h-screen bg-slate-100">
      <header className="flex items-center justify-between p-3 bg-white border-b border-slate-200 shadow-sm">
        <h1 className="text-xl font-bold text-slate-800">Estúdio de Criação</h1>
        <div className="flex items-center space-x-2">
           <button onClick={onCreateNew} className="px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-100 rounded-lg hover:bg-indigo-200 transition-colors flex items-center">
             <PlusIcon className="w-4 h-4 mr-2"/> Criar Novo
           </button>
           <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
            <SettingsIcon className="w-6 h-6" />
           </button>
           <button onClick={handleExport} disabled={isExporting} className="flex items-center justify-center px-4 py-2 font-semibold text-white bg-indigo-600 rounded-lg shadow-sm hover:bg-indigo-700 disabled:bg-slate-400 transition-all">
            <DownloadIcon className="w-5 h-5 mr-2" />
            {isExporting ? 'Exportando...' : 'Exportar Carrossel'}
          </button>
        </div>
      </header>
      
      {isExporting && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex flex-col items-center justify-center backdrop-blur-sm p-4 text-white">
            <p className="text-xl font-bold">{exportProgress.message}</p>
            <p className="text-sm opacity-80">Processando {exportProgress.current} de {exportProgress.total}...</p>
            <div className="w-64 h-2 bg-white/20 rounded-full mt-4 overflow-hidden">
                <div 
                    className="h-2 bg-white rounded-full transition-all duration-300"
                    style={{ width: `${(exportProgress.current / exportProgress.total) * 100}%` }}
                ></div>
            </div>
        </div>
      )}

      {exportSuccess && (
        <div className="absolute top-20 right-4 z-50 p-4 bg-green-100 border border-green-300 text-green-800 rounded-lg shadow-lg flex items-center animate-fade-in-down">
            <CheckCircleIcon className="w-6 h-6 mr-3 text-green-600" />
            <div>
                <p className="font-bold">🎉 Carrossel exportado!</p>
                <p className="text-sm">Seu arquivo .zip foi baixado.</p>
            </div>
        </div>
       )}

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-48 bg-white border-r border-slate-200 p-3 overflow-y-auto">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Slides</h2>
          <div className="space-y-2">
            {slides.map((slide, index) => (
              <div
                key={slide.id}
                onClick={() => setSelectedSlideId(slide.id)}
                className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${selectedSlideId === slide.id ? 'border-indigo-500' : 'border-transparent hover:border-indigo-300'}`}
                style={{ aspectRatio: '1 / 1'}}
              >
                <div className="w-full h-full bg-slate-200">
                  <SlidePreview slide={slide} settings={settings.visual} totalSlides={slides.length} isThumbnail />
                </div>
                <div className="absolute bottom-1 right-1 bg-black/50 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">{index + 1}</div>
              </div>
            ))}
          </div>
        </aside>

        <main className="flex-1 flex items-center justify-center p-8 bg-slate-200/50">
          <div
            ref={previewRef}
            className="h-full max-h-[70vh] w-auto bg-white shadow-2xl rounded-lg overflow-hidden"
            style={aspectRatioStyle}
          >
             <div className="w-full h-full">
                 {selectedSlide && <SlidePreview slide={selectedSlide} settings={settings.visual} totalSlides={slides.length} />}
             </div>
          </div>
        </main>

        <aside className="w-80 bg-white border-l border-slate-200 p-4 overflow-y-auto">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Editar Slide {selectedSlideId}</h2>
          {selectedSlide && (
            <div>
              <label htmlFor="slideText" className="flex items-center text-base font-semibold text-slate-700 mb-2">
                <EditIcon className="w-5 h-5 mr-2" />
                Texto do Slide
              </label>
              <textarea
                id="slideText"
                value={selectedSlide.text}
                onChange={(e) => onUpdateSlideText(selectedSlideId, e.target.value)}
                maxLength={350}
                className="w-full h-48 p-3 text-sm text-slate-800 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
               <p className={`text-right text-xs mt-1 font-medium ${charColor}`}>
                {charCount} / {charLimit} caracteres
               </p>
              
              {isImageSlide && (
                  <div className="mt-6">
                     <h3 className="text-base font-semibold text-slate-700 mb-2 flex items-center">
                        <ImageIcon className="w-5 h-5 mr-2" /> Imagem de Fundo
                     </h3>
                     <button 
                        onClick={() => onRegenerateImage(selectedSlide.id)}
                        disabled={isRegeneratingImage}
                        className="w-full py-2 px-4 text-sm font-semibold text-indigo-700 bg-indigo-100 rounded-lg hover:bg-indigo-200 transition-colors disabled:bg-slate-200 disabled:text-slate-500"
                     >
                         {isRegeneratingImage ? 'Gerando...' : 'Gerar Nova Imagem'}
                     </button>
                  </div>
              )}
            </div>
          )}
        </aside>
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSettingsChange={onSettingsChange}
      />
    </div>
  );
};