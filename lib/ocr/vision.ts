import { IExtractor } from './interfaces'

export class VisionExtractor implements IExtractor {
  supportedMimeTypes = ['image/jpeg', 'image/png', 'image/webp']

  async extractText(base64Data: string): Promise<string> {
    const apiKey = process.env.GOOGLE_CLOUD_API_KEY
    if (!apiKey) {
      throw new Error('Google Cloud API Key is not configured. Please add GOOGLE_CLOUD_API_KEY to your .env file.')
    }

    const url = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            image: {
              content: base64Data,
            },
            features: [
              {
                type: 'TEXT_DETECTION',
              },
            ],
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Google Cloud Vision API Error:', errorText)
      throw new Error(`Google Cloud Vision API returned status ${response.status}: ${errorText}`)
    }

    const result = await response.json()
    const rawText = result.responses?.[0]?.fullTextAnnotation?.text
    if (!rawText) {
      throw new Error('No text detected in the document by Google Cloud Vision API.')
    }

    return rawText
  }
}
