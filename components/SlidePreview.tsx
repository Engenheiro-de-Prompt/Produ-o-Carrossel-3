import React from 'react';
import type { Slide, VisualSettings } from '../types';
import { ArrowRightIcon } from './icons';

interface SlidePreviewProps {
  slide: Slide;
  settings: VisualSettings;
  totalSlides: number;
  isThumbnail?: boolean;
}

const formatTextToHtml = (text: string, highlightColor: string): string => {
  if (!text) return '';
  // Escape HTML tags first
  let processedText = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  
  // Apply colored highlight ++word++
  processedText = processedText.replace(/\+\+(.*?)\+\+/g, `<strong style="color: ${highlightColor};">$1</strong>`);
  
  // Then apply standard bold **word**
  processedText = processedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Handle newlines
  return processedText.replace(/\n/g, '<br />');
};

export const SlidePreview: React.FC<SlidePreviewProps> = ({ slide, settings, totalSlides, isThumbnail = false }) => {
  const isImageBg = slide.background.startsWith('data:image');
  const isLoading = slide.background === 'loading';
  const isDarkBg = !isImageBg && !isLoading && slide.background === settings.colors.slideBGDark;

  const textColor = isImageBg || isDarkBg ? settings.colors.textLight : settings.colors.textDark;
  
  const textLines = slide.text.split('\n');
  const titleText = textLines[0] || '';
  const descriptionText = textLines.slice(1).join('\n').trim();

  const getScaledValue = (value: number) => {
    // Scaling is disabled for a more direct WYSIWYG approach
    // if (isThumbnail) return value / 4;
    return value;
  }
  
  const titleStyle: React.CSSProperties = {
    fontFamily: settings.typography.fontFamily,
    fontSize: `${getScaledValue(settings.typography.titleFontSize)}px`,
    lineHeight: settings.typography.lineSpacing,
    color: textColor,
    fontWeight: 'bold',
  };

  const descriptionStyle: React.CSSProperties = {
     fontFamily: settings.typography.fontFamily,
     fontSize: `${getScaledValue(settings.typography.descriptionFontSize)}px`,
     lineHeight: settings.typography.lineSpacing,
     color: textColor,
     marginTop: `${getScaledValue(12)}px`,
  };

  const containerStyle: React.CSSProperties = {
    padding: `${getScaledValue(settings.style.margin)}px`,
    textShadow: isImageBg ? `1px 1px 3px rgba(0,0,0,0.5)` : 'none',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    zIndex: 10,
    position: 'relative',
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: settings.style.textAlignment === 'left' ? 'flex-start' : settings.style.textAlignment === 'right' ? 'flex-end' : 'center',
    textAlign: settings.style.textAlignment,
    justifyContent: 'center'
  };

  const backgroundStyle: React.CSSProperties = {
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    width: '100%',
    height: '100%',
    position: 'absolute',
    ...(isImageBg
      ? { backgroundImage: `url(${slide.background})` }
      : { backgroundColor: isLoading ? '#E0E7FF' : slide.background }),
  };
  
  const overlayStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    backgroundColor: settings.colors.overlayColor,
    opacity: settings.style.overlayOpacity,
    zIndex: 1,
  };


  if (isLoading) {
    return (
        <div className="w-full h-full flex items-center justify-center" style={{backgroundColor: '#E0E7FF'}}>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
    );
  }

  return (
    <div
      className="w-full h-full flex items-center justify-center relative overflow-hidden"
    >
      <div style={backgroundStyle}></div>
      {isImageBg && <div style={overlayStyle}></div>}
      <div style={containerStyle} data-testid="text-container">
        <p
            data-testid="title-text"
            style={titleStyle}
            dangerouslySetInnerHTML={{ __html: formatTextToHtml(titleText, settings.colors.highlight) }}
        ></p>
        {descriptionText && (
            <p
                data-testid="desc-text"
                style={descriptionStyle}
                dangerouslySetInnerHTML={{ __html: formatTextToHtml(descriptionText, settings.colors.highlight) }}
            ></p>
        )}
      </div>
      
      {!isThumbnail && slide.id < totalSlides && (
        <div className="absolute bottom-5 right-5 z-20" style={{ color: textColor, textShadow: isImageBg ? `1px 1px 2px rgba(0,0,0,0.7)` : 'none' }}>
            <ArrowRightIcon className="w-6 h-6"/>
        </div>
      )}
    </div>
  );
};