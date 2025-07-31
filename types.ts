export interface Slide {
  id: number;
  text: string;
  background: string; // Can be a color hex or a base64 image string
}

export type AspectRatio = string;
export type ApiProvider = 'gemini' | 'openai';

export interface GenerationSettings {
  apiProvider: ApiProvider;
  textModel: string;
  imageModel: string;
  aspectRatio: AspectRatio;
  slidePrompt: string;
  imagePrompt: string;
}

export interface VisualSettings {
    typography: {
      fontFamily: string;
      titleFontSize: number;
      descriptionFontSize: number;
      lineSpacing: number;
    };
    colors: {
      textLight: string;
      textDark: string;
      highlight: string;
      slideBGLight: string;
      slideBGDark: string;
      slideBGAccent: string;
      overlayColor: string;
    };
    style: {
      textAlignment: 'center' | 'left' | 'right';
      margin: number;
      overlayOpacity: number;
    };
}

export interface AppSettings {
    generation: GenerationSettings;
    visual: VisualSettings;
}
