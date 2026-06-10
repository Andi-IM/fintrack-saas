import { IExtractor } from './interfaces'

export class DoctrOcrExtractor implements IExtractor {
  supportedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']

  canHandle(mimeType: string, context: { filename?: string; routeToDoctr?: boolean }): boolean {
    return this.supportedMimeTypes.includes(mimeType) && !!context.routeToDoctr;
  }

  async extractText(base64Data: string): Promise<string> {
    const serviceUrl = process.env.OCR_SERVICE_URL
    const apiKey = process.env.OCR_API_KEY

    if (!serviceUrl) {
      throw new Error('OCR_SERVICE_URL is not configured. Please add it to your environment variables.')
    }
    if (!apiKey) {
      throw new Error('OCR_API_KEY is not configured. Please add it to your environment variables.')
    }

    try {
      // Reconstruct buffer from base64
      const buffer = Buffer.from(base64Data, 'base64')
      
      // Determine file extension and name
      // We check the first few bytes (magic numbers) of the base64 string to detect PDF vs Image.
      // - 'JVBERi': %PDF- (PDF)
      // - 'iVBORw': .PNG
      // - '/9j/4A': .JPG/.JPEG
      const isPdf = base64Data.startsWith('JVBERi')
      let filename = 'document.png'
      let mimeType = 'image/png'

      if (isPdf) {
        filename = 'document.pdf'
        mimeType = 'application/pdf'
      } else if (base64Data.startsWith('/9j/4A')) {
        filename = 'document.jpg'
        mimeType = 'image/jpeg'
      } else if (base64Data.startsWith('UklGR')) {
        filename = 'document.webp'
        mimeType = 'image/webp'
      }

      const blob = new Blob([buffer], { type: mimeType })
      const formData = new FormData()
      formData.append('file', blob, filename)

      console.log(`Sending document to docTR OCR service at: ${serviceUrl} (File: ${filename}, Size: ${buffer.length} bytes)`)

      const response = await fetch(serviceUrl, {
        method: 'POST',
        headers: {
          'X-API-Key': apiKey,
        },
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('docTR OCR Service Error:', errorText)
        throw new Error(`docTR OCR Service returned status ${response.status}: ${errorText}`)
      }

      const result = await response.json()
      
      if (result.status === 'success' && result.data && Array.isArray(result.data.pages)) {
        const rawText = (result.data.pages as { full_text: string }[]).map((page) => page.full_text).join('\n---PAGE_BREAK---\n')
        if (rawText && rawText.trim().length > 0) {
          return rawText
        }
      }

      if (result.status === 'error') {
        throw new Error(result.message || 'docTR OCR Service returned an error status.')
      }

      throw new Error('No text detected in the document by docTR OCR service.')
    } catch (error) {
      console.error('DoctrOcrExtractor Error:', error)
      const message = error instanceof Error ? error.message : 'Failed to extract text with docTR OCR service'
      throw new Error(message)
    }
  }
}
