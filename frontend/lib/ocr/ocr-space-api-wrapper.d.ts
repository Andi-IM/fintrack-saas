declare module 'ocr-space-api-wrapper' {
  export interface OcrSpaceOptions {
    apiKey?: string;
    isTable?: boolean;
    OCREngine?: string;
    [key: string]: any;
  }

  export interface OcrSpaceResponse {
    ParsedResults?: Array<{
      ParsedText: string;
    }>;
    ErrorMessage?: string | string[];
    [key: string]: any;
  }

  export function ocrSpace(
    filePath: string,
    options?: OcrSpaceOptions
  ): Promise<OcrSpaceResponse>;
}
