const sharp = require('sharp')
const crypto = require('crypto')

// Spread-spectrum blind watermark
//
// Embeds payload bits into image pixel values using a password-seeded
// pseudo-random pattern. Each payload bit is spread across many pixels
// for robustness against mild compression and resizing.

const BITS_PER_BYTE = 8
const SPREAD_FACTOR = 256
const HEADER_BITS = 16

function prng(seed) {
  let state = crypto.createHash('sha256').update(seed).digest()
  let offset = 0

  return function next() {
    if (offset >= state.length - 4) {
      state = crypto.createHash('sha256').update(state).digest()
      offset = 0
    }
    const val = state.readUInt32BE(offset)
    offset += 4
    return val
  }
}

function payloadToBits(payload) {
  const bytes = Buffer.from(payload, 'utf-8')
  if (bytes.length > 255) {
    throw new Error('blind watermark payload too long (max 255 bytes)')
  }

  const lenBits = []
  for (let i = HEADER_BITS - 1; i >= 0; i--) {
    lenBits.push((bytes.length >> i) & 1)
  }

  const dataBits = []
  for (const byte of bytes) {
    for (let i = 7; i >= 0; i--) {
      dataBits.push((byte >> i) & 1)
    }
  }

  return [...lenBits, ...dataBits]
}

function generatePattern(rng, length) {
  const pattern = new Float64Array(length)
  for (let i = 0; i < length; i++) {
    pattern[i] = (rng() % 2 === 0) ? 1.0 : -1.0
  }
  return pattern
}

async function embedBlindWatermark(imageBuffer, opts) {
  const { payload, password, strength } = opts
  const bits = payloadToBits(payload)
  const totalBits = bits.length
  const pixelsNeeded = totalBits * SPREAD_FACTOR

  const image = sharp(imageBuffer)
  const meta = await image.metadata()
  const { width, height, channels } = meta

  const totalPixels = width * height
  if (totalPixels < pixelsNeeded) {
    throw new Error(
      `Image too small for payload: need ${pixelsNeeded} pixels, have ${totalPixels}`
    )
  }

  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const pixels = new Uint8Array(data)
  const ch = info.channels
  const rng = prng(password)

  const pixelIndices = new Uint32Array(totalPixels)
  for (let i = 0; i < totalPixels; i++) {
    pixelIndices[i] = i
  }

  for (let i = totalPixels - 1; i > 0; i--) {
    const j = rng() % (i + 1)
    const tmp = pixelIndices[i]
    pixelIndices[i] = pixelIndices[j]
    pixelIndices[j] = tmp
  }

  const rngPattern = prng(password + ':pattern')

  for (let bitIdx = 0; bitIdx < totalBits; bitIdx++) {
    const bitValue = bits[bitIdx]
    const sign = bitValue === 1 ? 1 : -1
    const startPixel = bitIdx * SPREAD_FACTOR

    for (let s = 0; s < SPREAD_FACTOR; s++) {
      const pixelIndex = pixelIndices[startPixel + s]
      const offset = pixelIndex * ch

      const patternVal = (rngPattern() % 2 === 0) ? 1.0 : -1.0
      const delta = Math.round(sign * patternVal * strength)

      // Embed in blue channel (least perceptible to human eye)
      const blueIdx = offset + 2
      pixels[blueIdx] = Math.max(0, Math.min(255, pixels[blueIdx] + delta))
    }
  }

  const result = await sharp(Buffer.from(pixels.buffer), {
    raw: { width: info.width, height: info.height, channels: ch },
  })
    .png()
    .toBuffer()

  return result
}

async function extractBlindWatermark(imageBuffer, opts) {
  const { password, strength } = opts

  const image = sharp(imageBuffer)
  const meta = await image.metadata()
  const { width, height } = meta

  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const pixels = new Uint8Array(data)
  const ch = info.channels
  const totalPixels = width * height
  const rng = prng(password)

  const pixelIndices = new Uint32Array(totalPixels)
  for (let i = 0; i < totalPixels; i++) {
    pixelIndices[i] = i
  }

  for (let i = totalPixels - 1; i > 0; i--) {
    const j = rng() % (i + 1)
    const tmp = pixelIndices[i]
    pixelIndices[i] = pixelIndices[j]
    pixelIndices[j] = tmp
  }

  const maxBits = Math.floor(totalPixels / SPREAD_FACTOR)
  if (maxBits < HEADER_BITS) {
    throw new Error('Image too small to contain watermark')
  }

  const rngPattern = prng(password + ':pattern')

  function decodeBit(bitIdx) {
    const startPixel = bitIdx * SPREAD_FACTOR
    const blues = new Float64Array(SPREAD_FACTOR)
    const patterns = new Float64Array(SPREAD_FACTOR)
    let blueSum = 0

    for (let s = 0; s < SPREAD_FACTOR; s++) {
      const pixelIndex = pixelIndices[startPixel + s]
      const offset = pixelIndex * ch
      blues[s] = pixels[offset + 2]
      patterns[s] = (rngPattern() % 2 === 0) ? 1.0 : -1.0
      blueSum += blues[s]
    }

    const blueMean = blueSum / SPREAD_FACTOR
    let correlation = 0
    for (let s = 0; s < SPREAD_FACTOR; s++) {
      correlation += (blues[s] - blueMean) * patterns[s]
    }

    return correlation > 0 ? 1 : 0
  }

  let payloadLength = 0
  for (let i = 0; i < HEADER_BITS; i++) {
    payloadLength = (payloadLength << 1) | decodeBit(i)
  }

  if (payloadLength <= 0 || payloadLength > 255) {
    return null
  }

  const dataBits = payloadLength * BITS_PER_BYTE
  const neededBits = HEADER_BITS + dataBits
  if (neededBits > maxBits) {
    return null
  }

  const bytes = []
  for (let byteIdx = 0; byteIdx < payloadLength; byteIdx++) {
    let byte = 0
    for (let bit = 0; bit < 8; bit++) {
      const bitIdx = HEADER_BITS + byteIdx * 8 + bit
      byte = (byte << 1) | decodeBit(bitIdx)
    }
    bytes.push(byte)
  }

  return Buffer.from(bytes).toString('utf-8')
}

module.exports = { embedBlindWatermark, extractBlindWatermark }
