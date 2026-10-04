import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { deflateSync } from 'zlib'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Create simple PNG icons using a minimal approach

function crc32(buf) {
  const table = []
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
    }
    table[i] = c
  }
  let crc = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF]
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function createPng(size, color) {
  const header = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
  
  // IHDR chunk
  const ihdrData = Buffer.alloc(13)
  ihdrData.writeUInt32BE(size, 0)
  ihdrData.writeUInt32BE(size, 4)
  ihdrData[8] = 8
  ihdrData[9] = 2
  ihdrData[10] = 0
  ihdrData[11] = 0
  ihdrData[12] = 0
  
  const ihdrCrc = crc32(Buffer.concat([Buffer.from('IHDR'), ihdrData]))
  const ihdrChunk = Buffer.concat([
    Buffer.from([0, 0, 0, 13]),
    Buffer.from('IHDR'),
    ihdrData,
    Buffer.from([ihdrCrc >>> 24, (ihdrCrc >>> 16) & 0xFF, (ihdrCrc >>> 8) & 0xFF, ihdrCrc & 0xFF])
  ])
  
  // IDAT chunk - create pixel data with zlib compression
  const pixelData = Buffer.alloc(size * (size * 3 + 1))
  for (let y = 0; y < size; y++) {
    pixelData[y * (size * 3 + 1)] = 0 // filter type
    for (let x = 0; x < size; x++) {
      const idx = y * (size * 3 + 1) + 1 + x * 3
      pixelData[idx] = color.r
      pixelData[idx + 1] = color.g
      pixelData[idx + 2] = color.b
    }
  }
  
  const compressed = deflateSync(pixelData)
  
  const idatCrc = crc32(Buffer.concat([Buffer.from('IDAT'), compressed]))
  const idatChunk = Buffer.concat([
    Buffer.from([compressed.length >>> 24, (compressed.length >>> 16) & 0xFF, (compressed.length >>> 8) & 0xFF, compressed.length & 0xFF]),
    Buffer.from('IDAT'),
    compressed,
    Buffer.from([idatCrc >>> 24, (idatCrc >>> 16) & 0xFF, (idatCrc >>> 8) & 0xFF, idatCrc & 0xFF])
  ])
  
  // IEND chunk
  const iendCrc = crc32(Buffer.from('IEND'))
  const iendChunk = Buffer.concat([
    Buffer.from([0, 0, 0, 0]),
    Buffer.from('IEND'),
    Buffer.from([iendCrc >>> 24, (iendCrc >>> 16) & 0xFF, (iendCrc >>> 8) & 0xFF, iendCrc & 0xFF])
  ])
  
  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk])
}

const sizes = [16, 32, 48, 128]
const color = { r: 79, g: 70, b: 229 } // Indigo #4f46e5

const iconsDir = path.join(__dirname, 'public', 'icons')
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true })
}

for (const size of sizes) {
  const png = createPng(size, color)
  fs.writeFileSync(path.join(iconsDir, `icon-${size}.png`), png)
  console.log(`Created icon-${size}.png`)
}

console.log('All icons created!')