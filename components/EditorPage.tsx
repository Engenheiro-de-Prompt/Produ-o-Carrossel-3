import { useState, useRef, useEffect } from "react";
import { toJpeg } from "html-to-image";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { ArrowLeft, Download, Settings, Loader, Sparkles } from "lucide-react";
import { Slide, Settings as AppSettings } from "../types";
import { SlidePreview } from "./SlidePreview";
import { SettingsModal } from "./SettingsModal";
import { generateImage } from "../services/aiService";
import { INITIAL_SETTINGS } from "../constants";
import { getEmbeddedFontCss } from "../utils";

export const EditorPage = ({
  initialSlides,
  initialSettings,
  onBack,
}: {
  initialSlides: Slide[];
  initialSettings: AppSettings;
  onBack: () => void;
}) => {
  const [slides, setSlides] = useState<Slide[]>(initialSlides);
  const [settings, setSettings] = useState<AppSettings>(initialSettings);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const previewRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    // Update preview refs array size when slides change
    previewRefs.current = previewRefs.current.slice(0, slides.length);
  }, [slides]);

  const handleSettingsChange = (newSettings: AppSettings) => {
    setSettings(newSettings);
    // Potentially update slides if a global setting affects them
  };

  const handleSlideTextChange = (index: number, newText: string) => {
    const newSlides = [...slides];
    newSlides[index].text = newText;
    setSlides(newSlides);
  };

  const handleRegenerateImage = async (index: number) => {
    const slide = slides[index];
    if (!slide) return;

    setIsGenerating(true);
    try {
      const imageUrl = await generateImage(
        settings.aiProvider,
        slide.text.split("\n")[0], // Use title for prompt
        settings.aspectRatio
      );
      const newSlides = [...slides];
      newSlides[index].backgroundImage = imageUrl;
      setSlides(newSlides);
    } catch (error) {
      console.error("Failed to regenerate image:", error);
      alert("Failed to regenerate image. See console for details.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);
    const zip = new JSZip();

    // Create a hidden container for rendering the slides for export
    const exportContainer = document.createElement("div");
    exportContainer.style.position = "fixed";
    exportContainer.style.left = "-9999px";
    exportContainer.style.top = "-9999px";
    document.body.appendChild(exportContainer);

    const fontCss = await getEmbeddedFontCss(settings.fontFamily);

    for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        const node = document.createElement('div');

        // Set exact dimensions for export
        const ratioParts = settings.aspectRatio.split(':').map(Number);
        const exportWidth = 1080;
        const exportHeight = (exportWidth * ratioParts[1]) / ratioParts[0];

        node.style.width = `${exportWidth}px`;
        node.style.height = `${exportHeight}px`;

        exportContainer.appendChild(node);

        // We need a way to render our React component into this DOM node.
        // The best way is to use a temporary React root.
        const { createRoot } = await import('react-dom/client');
        const root = createRoot(node);

        // Render the SlidePreview component into our detached node
        await new Promise<void>(resolve => {
            root.render(
                <>
                    <style>{fontCss}</style>
                    <SlidePreview
                        slide={slide}
                        settings={settings}
                        isActive={true} // Ensure styles are applied as if active
                        isExporting={true}
                    />
                </>
            );
            // Give React a moment to commit the render
            setTimeout(resolve, 100);
        });


        // Wait for fonts to be ready
        await document.fonts.ready;

        try {
            const dataUrl = await toJpeg(node, {
                quality: 0.95,
                width: exportWidth,
                height: exportHeight,
                pixelRatio: 1,
                // No need to pass fontCss here as it's already in a style tag
            });
            zip.file(`slide_${i + 1}.jpeg`, dataUrl.split(",")[1], { base64: true });
        } catch (error) {
            console.error(`Failed to export slide ${i + 1}:`, error);
            alert(`An error occurred while exporting slide ${i + 1}. See console for details.`);
            setIsExporting(false);
            document.body.removeChild(exportContainer);
            return;
        } finally {
             // Unmount the component and clean up the DOM node
            root.unmount();
            exportContainer.removeChild(node);
        }

        setExportProgress(((i + 1) / slides.length) * 100);
    }

    document.body.removeChild(exportContainer);

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "carousel.zip");
    setIsExporting(false);
};


  const activeSlide = slides[activeSlideIndex];

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="flex items-center justify-between p-4 bg-gray-800 shadow-md">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md hover:bg-gray-700 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Start
        </button>
        <h1 className="text-xl font-bold">Edit Your Carousel</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md hover:bg-gray-700 transition-colors"
          >
            <Settings size={16} />
            Settings
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors disabled:bg-indigo-400 disabled:cursor-not-allowed"
          >
            {isExporting ? <Loader size={16} className="animate-spin" /> : <Download size={16} />}
            {isExporting ? `Exporting...` : "Export All"}
          </button>
        </div>
      </header>

      {isExporting && (
         <div className="w-full bg-gray-700 rounded-full h-2.5">
            <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${exportProgress}%` }}></div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex flex-1 overflow-hidden">
        {/* Slides Thumbnail Panel */}
        <aside className="w-64 p-4 overflow-y-auto bg-gray-800 border-r border-gray-700">
          <h2 className="mb-4 text-lg font-semibold">Slides</h2>
          <div className="space-y-4">
            {slides.map((slide, index) => (
              <div
                key={slide.id}
                onClick={() => setActiveSlideIndex(index)}
                className={`cursor-pointer border-2 rounded-lg transition-all ${
                  activeSlideIndex === index
                    ? "border-indigo-500 scale-105"
                    : "border-gray-600 hover:border-indigo-400"
                }`}
              >
                <div
                    className="aspect-[4/5] bg-gray-700 rounded-md overflow-hidden pointer-events-none"
                    style={{ transform: 'scale(0.95)'}}
                >
                     <SlidePreview
                        slide={slide}
                        settings={settings}
                        isActive={false} // Small previews are not "active"
                      />
                </div>
                <p className="p-2 text-xs text-center text-gray-400">Slide {index + 1}</p>
              </div>
            ))}
          </div>
        </aside>

        {/* Editor Panel */}
        <section className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-900">
            <div className="w-full max-w-lg mb-8">
                 <div ref={el => (previewRefs.current[activeSlideIndex] = el)} className="transition-all duration-300">
                    <SlidePreview
                    slide={activeSlide}
                    settings={settings}
                    isActive={true}
                    />
                 </div>
            </div>

            <div className="w-full max-w-lg p-6 bg-gray-800 rounded-lg shadow-lg">
                <label htmlFor="slideText" className="block mb-2 text-sm font-medium text-gray-300">
                    Slide {activeSlideIndex + 1} Text
                </label>
                <textarea
                    id="slideText"
                    value={activeSlide.text}
                    onChange={(e) => handleSlideTextChange(activeSlideIndex, e.target.value)}
                    className="w-full h-32 p-3 text-white bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                />
                 {(activeSlide.backgroundImage || activeSlideIndex === 0 || activeSlideIndex === slides.length - 1) && (
                     <button
                        onClick={() => handleRegenerateImage(activeSlideIndex)}
                        disabled={isGenerating}
                        className="flex items-center justify-center w-full gap-2 px-4 py-2 mt-4 text-sm font-semibold text-white bg-purple-600 rounded-md hover:bg-purple-700 transition-colors disabled:bg-purple-400"
                    >
                       {isGenerating ? <Loader size={16} className="animate-spin" /> : <Sparkles size={16} />}
                        Regenerate Image
                    </button>
                 )}
            </div>

        </section>
      </main>

      {isSettingsModalOpen && (
        <SettingsModal
          settings={settings}
          onSave={handleSettingsChange}
          onClose={() => setIsSettingsModalOpen(false)}
        />
      )}
    </div>
  );
};