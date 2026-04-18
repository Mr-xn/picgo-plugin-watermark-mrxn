#!/usr/bin/env node

const { extractBlindWatermark } = require('./src/blind-watermark')
const fs = require('fs')

const args = process.argv.slice(2)

if (args.length < 1 || args.includes('--help') || args.includes('-h')) {
  console.log(`用法: node extract-watermark.js <图片路径> [密码]

参数:
  图片路径    待检测的图片文件 (png/jpg/webp)
  密码        盲水印密钥 (默认: 136677)

示例:
  node extract-watermark.js photo.png
  node extract-watermark.js photo.png mypassword`)
  process.exit(args.includes('--help') || args.includes('-h') ? 0 : 1)
}

const imagePath = args[0]
const password = args[1] || '136677'

if (!fs.existsSync(imagePath)) {
  console.error(`错误: 文件不存在: ${imagePath}`)
  process.exit(1)
}

async function main() {
  const imageBuffer = fs.readFileSync(imagePath)
  console.log(`文件: ${imagePath} (${imageBuffer.length} bytes)`)
  console.log(`密码: ${password}`)
  console.log('---')

  const payload = await extractBlindWatermark(imageBuffer, { password, strength: 3 })

  if (payload) {
    console.log(`✓ 检测到盲水印`)
    console.log(`  内容: "${payload}"`)
  } else {
    console.log(`✗ 未检测到盲水印 (密码不匹配或图片未嵌入)`)
  }
}

main().catch(err => {
  console.error(`错误: ${err.message}`)
  process.exit(1)
})
