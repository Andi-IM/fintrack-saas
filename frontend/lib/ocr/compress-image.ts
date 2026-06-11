const MAX_BYTES = 1 * 1024 * 1024
const MAX_DIMENSION = 2048

export async function compressImageIfNeeded(file: File): Promise<File> {
  if (file.size <= MAX_BYTES) return file

  const img = await loadImage(file)
  let { width, height } = img

  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height)
    width = Math.round(width * ratio)
    height = Math.round(height * ratio)
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, width, height)

  let quality = 0.85
  let blob: Blob | null = null

  while (quality > 0.1) {
    blob = await new Promise<Blob | null>(resolve =>
      canvas.toBlob(resolve, 'image/jpeg', quality)
    )
    if (!blob || blob.size <= MAX_BYTES) break
    quality -= 0.1
  }

  if (!blob || blob.size >= file.size) return file

  const name = file.name.replace(/\.\w+$/, '.jpg')
  return new File([blob], name, { type: 'image/jpeg' })
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    img.src = url
  })
}
