import { Slide, Settings } from "../types";
import { ArrowRight } from 'lucide-react';
import { useMemo } from 'react';

export const SlidePreview = ({
  slide,
  settings,
  isActive,
  isExporting = false,
}: {
  slide: Slide;
  settings: Settings;
  isActive: boolean;
  isExporting?: boolean;
}) => {
  const {
    aspectRatio,
    fontFamily,
    titleFontSize,
    descriptionFontSize,
    textColor,
    overlayColor,
    overlayOpacity,
  } = settings;

  const [title, ...descriptionLines] = slide.text.split("\n");
  const description = descriptionLines.join("\n");

  const aspectRatioClass = {
    "1:1": "aspect-[1/1]",
    "4:5": "aspect-[4/5]",
    "9:16": "aspect-[9/16]",
  }[aspectRatio];

  // Apply font family via inline style when exporting to ensure it's picked up
  const exportStyles = isExporting ? { fontFamily: `'${fontFamily}', sans-serif` } : {};

  const overlayStyle = {
    backgroundColor: overlayColor,
    opacity: overlayOpacity / 100,
  };
  
  const hasBackgroundImage = slide.backgroundImage && slide.backgroundImage !== 'none';

  return (
    <div
      className={`relative w-full overflow-hidden bg-black flex items-center justify-center ${aspectRatioClass}`}
      style={{
        color: textColor,
        ...exportStyles,
      }}
    >
      {/* Background Image */}
      {hasBackgroundImage && (
        <img
          src={slide.backgroundImage}
          alt="Slide background"
          className="absolute top-0 left-0 w-full h-full object-cover"
        />
      )}
      
       {/* Background Color Fallback/Default */}
      {!hasBackgroundImage && (
         <div className="absolute inset-0" style={{ backgroundColor: slide.backgroundColor || '#000' }}></div>
      )}

      {/* Overlay */}
      {hasBackgroundImage && (
        <div
          className="absolute inset-0"
          style={overlayStyle}
        ></div>
      )}

      {/* Text Content */}
      <div className="relative z-10 flex flex-col justify-center h-full w-full p-[8%] text-center">
        <h1
          className="font-bold leading-tight"
          style={{
            fontSize: `${titleFontSize}px`,
            fontFamily: `'${fontFamily}', sans-serif`,
          }}
        >
          {title}
        </h1>
        {description && (
          <p
            className="mt-4 whitespace-pre-wrap leading-relaxed"
            style={{
              fontSize: `${descriptionFontSize}px`,
              fontFamily: `'${fontFamily}', sans-serif`,
            }}
          >
            {description}
          </p>
        )}
      </div>

       {/* Arrow Icon */}
       {!slide.isLast && (
         <ArrowRight
            className="absolute bottom-5 right-5 z-20"
            color={textColor}
            size={24}
        />
       )}
    </div>
  );
};