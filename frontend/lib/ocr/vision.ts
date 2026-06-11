import { IExtractor } from './interfaces'

export class VisionExtractor implements IExtractor {
  supportedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

  canHandle(mimeType: string, context: { filename?: string; routeToDoctr?: boolean }): boolean {
    return this.supportedMimeTypes.includes(mimeType);
  }

  async extractText(base64Data: string): Promise<string> {
    const apiKey = process.env.GOOGLE_CLOUD_API_KEY
    if (!apiKey) {
      throw new Error('Google Cloud API Key is not configured. Please add GOOGLE_CLOUD_API_KEY to your .env file.')
    }

    const isPdf = base64Data.startsWith('JVBER') || base64Data.length > 100 && base64Data.substring(0, 100).includes('PDF');
    
    // For PDFs, Vision API uses a different endpoint or batch request
    // Here we use the online detection for small PDFs (up to 5 pages)
    const url = isPdf 
      ? `https://vision.googleapis.com/v1/files:annotate?key=${apiKey}`
      : `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;

    const body = isPdf 
      ? {
          requests: [{
            inputConfig: {
              content: base64Data,
              mimeType: 'application/pdf'
            },
            features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],      
            "imageContext": { "languageHints": ["id"]},
            // Specify pages to process if needed
            pages: [1, 2, 3, 4, 5] 
          }]
        }
      : {
          requests: [{
            image: { content: base64Data },
            features: [{ type: 'TEXT_DETECTION' }],
            "imageContext": { "languageHints": ["id"]}
          }]
        };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Google Cloud Vision API Error:', errorText)
      throw new Error(`Google Cloud Vision API returned status ${response.status}: ${errorText}`)
    }

    const result = await response.json()
    
    // Debug: Analyze the structure of the response
    if (result.responses?.[0]) {
      const annotation = isPdf ? result.responses[0].responses?.[0]?.fullTextAnnotation : result.responses[0].fullTextAnnotation;
      if (annotation) {
        const blocks = annotation.pages?.[0]?.blocks || [];
        console.log(`Vision API Analysis: Found ${blocks.length} blocks in the first page.`);
        blocks.forEach((block: any, bIdx: number) => {
          const paragraphs = block.paragraphs || [];
          const blockText = paragraphs.map((p: any) => 
            p.words?.map((w: any) => w.symbols?.map((s: any) => s.text).join('')).join(' ')
          ).join('\n');
          const wordCount = paragraphs.reduce((acc: number, p: any) => acc + (p.words?.length || 0), 0);
          console.log(`  Block ${bIdx}: ${paragraphs.length} paragraphs, ${wordCount} words.`);
          console.log(`    Preview: ${blockText.substring(0, 100).replace(/\n/g, ' ')}${blockText.length > 100 ? '...' : ''}`);
        });
      }
    }

    if (isPdf) {
      // PDF response has a different structure (responses[0].responses[0] because it's a batch of files then a batch of pages)
      const pages = result.responses?.[0]?.responses;
      if (!pages || pages.length === 0) {
        throw new Error('No text detected in the PDF by Google Cloud Vision API.')
      }
      return pages.map((p: any) => p.fullTextAnnotation?.text || '').join('\n---PAGE_BREAK---\n');
    }

    const rawText = result.responses?.[0]?.fullTextAnnotation?.text
    if (!rawText) {
      throw new Error('No text detected in the document by Google Cloud Vision API.')
    }

    return rawText
  }
}
