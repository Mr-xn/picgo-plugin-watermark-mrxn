const sharp = require('sharp')
const { applyVisibleWatermark } = require('./src/visible-watermark')
const { embedBlindWatermark, extractBlindWatermark } = require('./src/blind-watermark')
const fs = require('fs')
const path = require('path')

async function createTestImage(width, height) {
  const channels = 3
  const pixels = Buffer.alloc(width * height * channels)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels
      pixels[i] = Math.floor((x / width) * 255)
      pixels[i + 1] = Math.floor((y / height) * 255)
      pixels[i + 2] = 128
    }
  }
  return sharp(pixels, { raw: { width, height, channels } }).png().toBuffer()
}

async function main() {
  const outDir = path.join(__dirname, 'test-output')
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir)

  console.log('=== Creating 800x600 test image ===')
  const original = await createTestImage(800, 600)
  fs.writeFileSync(path.join(outDir, '0-original.png'), original)
  console.log(`Original: ${original.length} bytes`)

  console.log('\n=== Test 1: Visible Watermark ===')
  try {
    const visible = await applyVisibleWatermark(original, {
      text: '请勿商用 mrxn.net',
      fontFamily: '',
      fontSize: 0,
      colorR: 255, colorG: 160, colorB: 122,
      alpha: 110,
      rotateDegree: -26,
      stepScaleX: 1.6, stepScaleY: 1.6,
      staggerRatio: 0.5,
    })
    fs.writeFileSync(path.join(outDir, '1-visible.png'), visible)
    console.log(`Visible watermark OK: ${visible.length} bytes`)
  } catch (err) {
    console.error('Visible watermark FAILED:', err.message)
  }

  console.log('\n=== Test 2: Blind Watermark Embed + Extract ===')
  try {
    const payload = 'watermark-pro|v1'
    const password = '136677'
    const strength = 3

    const embedded = await embedBlindWatermark(original, { payload, password, strength })
    fs.writeFileSync(path.join(outDir, '2-blind.png'), embedded)
    console.log(`Blind embed OK: ${embedded.length} bytes`)

    const extracted = await extractBlindWatermark(embedded, { password, strength })
    console.log(`Extracted payload: "${extracted}"`)
    console.log(`Match: ${extracted === payload ? 'PASS' : 'FAIL'}`)
  } catch (err) {
    console.error('Blind watermark FAILED:', err.message)
  }

  console.log('\n=== Test 3: Full Pipeline (visible + blind) ===')
  try {
    let buf = original
    buf = await applyVisibleWatermark(buf, {
      text: '请勿商用',
      fontFamily: '', fontSize: 0,
      colorR: 255, colorG: 160, colorB: 122, alpha: 110,
      rotateDegree: -26, stepScaleX: 1.6, stepScaleY: 1.6, staggerRatio: 0.5,
    })
    const payload = 'pipeline|test'
    buf = await embedBlindWatermark(buf, { payload, password: '136677', strength: 3 })
    fs.writeFileSync(path.join(outDir, '3-pipeline.png'), buf)
    console.log(`Pipeline OK: ${buf.length} bytes`)

    const extracted = await extractBlindWatermark(buf, { password: '136677', strength: 3 })
    console.log(`Pipeline extract: "${extracted}"`)
    console.log(`Pipeline match: ${extracted === payload ? 'PASS' : 'FAIL'}`)
  } catch (err) {
    console.error('Pipeline FAILED:', err.message)
  }

  console.log('\nDone. Check test-output/ for images.')
}

main().catch(console.error)
