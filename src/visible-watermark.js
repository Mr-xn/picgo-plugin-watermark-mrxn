const sharp = require('sharp')

const MIN_STEP_X = 80
const MIN_STEP_Y = 60

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function estimateTextWidth(text, fontSize) {
  let width = 0
  for (const ch of text) {
    width += ch.charCodeAt(0) > 0x2000 ? fontSize : fontSize * 0.6
  }
  return Math.ceil(width)
}

async function applyVisibleWatermark(imageBuffer, opts) {
  const meta = await sharp(imageBuffer).metadata()
  const { width, height } = meta

  const fontSize = opts.fontSize > 0
    ? opts.fontSize
    : Math.max(16, Math.floor(Math.min(width, height) / 24))

  const textWidth = estimateTextWidth(opts.text, fontSize)
  const textHeight = Math.ceil(fontSize * 1.2)

  const tileW = textWidth + 24
  const tileH = textHeight + 12

  const rad = Math.abs(opts.rotateDegree * Math.PI / 180)
  const rotatedW = Math.ceil(tileW * Math.cos(rad) + tileH * Math.sin(rad))
  const rotatedH = Math.ceil(tileW * Math.sin(rad) + tileH * Math.cos(rad))

  const stepX = Math.max(MIN_STEP_X, Math.floor(rotatedW * opts.stepScaleX))
  const stepY = Math.max(MIN_STEP_Y, Math.floor(rotatedH * opts.stepScaleY))

  const stagger = Math.floor(stepX * opts.staggerRatio)
  const alpha = (opts.alpha / 255).toFixed(3)
  const escapedText = escapeXml(opts.text)

  const fontFamily = opts.fontFamily ||
    'PingFang SC, Hiragino Sans GB, STHeiti, Noto Sans CJK SC, Microsoft YaHei, SimHei, sans-serif'

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs>
    <pattern id="wm" width="${stepX}" height="${stepY * 2}"
             patternUnits="userSpaceOnUse"
             patternTransform="rotate(${opts.rotateDegree})">
      <text x="12" y="${fontSize}"
            fill="rgba(${opts.colorR},${opts.colorG},${opts.colorB},${alpha})"
            font-size="${fontSize}"
            font-family="${fontFamily}">${escapedText}</text>
      <text x="${12 + stagger}" y="${fontSize + stepY}"
            fill="rgba(${opts.colorR},${opts.colorG},${opts.colorB},${alpha})"
            font-size="${fontSize}"
            font-family="${fontFamily}">${escapedText}</text>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#wm)"/>
</svg>`

  const result = await sharp(imageBuffer)
    .ensureAlpha()
    .composite([{ input: Buffer.from(svg), blend: 'over' }])
    .png()
    .toBuffer()

  return result
}

module.exports = { applyVisibleWatermark }
