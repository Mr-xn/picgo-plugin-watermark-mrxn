const { applyVisibleWatermark } = require('./visible-watermark')
const { embedBlindWatermark } = require('./blind-watermark')

const PLUGIN_NAME = 'watermark-mrxn'

// PicList second uploader modes
const SECOND_UPLOADER_MODES = {
  SAME: 'same',           // Apply same watermarks as primary (default)
  SKIP: 'skip',           // Skip all watermarking for second uploader
  VISIBLE_ONLY: 'visibleOnly', // Only apply visible watermark (skip blind)
  BLIND_ONLY: 'blindOnly',    // Only apply blind watermark (skip visible)
}

/**
 * Detect whether the current upload is targeting the PicList second uploader.
 *
 * PicList-Core's uploadReturnCtx() calls changeCurrentUploader() before the
 * second upload lifecycle, which sets picBed.${type} to the second uploader's
 * config object. We compare _id values to reliably identify the context,
 * since PicList-Core itself uses _id for deduplication.
 *
 * This detection only applies in independent mode (separate). In backup mode,
 * beforeUploadPlugins are skipped entirely, so this function is never called.
 */
function isSecondUploaderContext(ctx) {
  try {
    const enableSecondUploader = ctx.getConfig('settings.enableSecondUploader')
    if (!enableSecondUploader) return false

    const secondUploaderType = ctx.getConfig('picBed.secondUploader') || ''
    const secondUploaderConfig = ctx.getConfig('picBed.secondUploaderConfig') || {}
    if (!secondUploaderType || !secondUploaderConfig._id) return false

    const currentUploader =
      ctx.getConfig('picBed.uploader') ||
      ctx.getConfig('picBed.current') ||
      ''
    const currentConfig = ctx.getConfig(`picBed.${currentUploader}`) || {}

    return currentConfig._id && currentConfig._id === secondUploaderConfig._id
  } catch (_) {
    return false
  }
}

module.exports = ctx => {
  const handle = async ctx => {
    const config = ctx.getConfig(`picgo-plugin-${PLUGIN_NAME}`) || {}
    let enableVisible = config.enableVisible !== false
    let enableBlind = config.enableBlind !== false

    // PicList second uploader handling
    const isSecondUploader = isSecondUploaderContext(ctx)
    if (isSecondUploader) {
      const mode = config.secondUploaderMode || SECOND_UPLOADER_MODES.SAME
      ctx.log.info(`watermark-mrxn: detected PicList second uploader (independent mode), mode=${mode}`)

      if (mode === SECOND_UPLOADER_MODES.SKIP) {
        ctx.log.info('watermark-mrxn: skipping all watermarks for second uploader')
        return ctx
      }
      if (mode === SECOND_UPLOADER_MODES.VISIBLE_ONLY) {
        enableBlind = false
      }
      if (mode === SECOND_UPLOADER_MODES.BLIND_ONLY) {
        enableVisible = false
      }
    }

    if (!enableVisible && !enableBlind) {
      ctx.log.info('watermark-mrxn: both watermarks disabled, skipping')
      return ctx
    }

    for (let i = 0; i < ctx.output.length; i++) {
      const item = ctx.output[i]
      let buffer = item.buffer
        ? item.buffer
        : item.base64Image
          ? Buffer.from(item.base64Image, 'base64')
          : null

      if (!buffer) {
        ctx.log.warn(`watermark-mrxn: item[${i}] has no buffer, skipping`)
        continue
      }

      const ext = (item.extname || 'png').toLowerCase().replace('.', '')
      if (!['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
        ctx.log.info(`watermark-mrxn: item[${i}] ext=${ext} not supported, skipping`)
        continue
      }

      try {
        if (enableVisible) {
          buffer = await applyVisibleWatermark(buffer, {
            text: config.visibleText || '请勿商用',
            fontFamily: config.fontFamily || '',
            fontSize: config.fontSize || 0,
            colorR: config.colorR != null ? config.colorR : 255,
            colorG: config.colorG != null ? config.colorG : 160,
            colorB: config.colorB != null ? config.colorB : 122,
            alpha: config.alpha != null ? config.alpha : 110,
            rotateDegree: config.rotateDegree != null ? config.rotateDegree : -26,
            stepScaleX: config.stepScaleX || 1.6,
            stepScaleY: config.stepScaleY || 1.6,
            staggerRatio: config.staggerRatio != null ? config.staggerRatio : 0.5,
          })
          ctx.log.info(`watermark-mrxn: item[${i}] visible watermark applied`)
        }

        if (enableBlind) {
          buffer = await embedBlindWatermark(buffer, {
            payload: config.blindPayload || 'watermark-pro|v1',
            password: config.blindPassword || '136677',
            strength: config.blindStrength || 3,
          })
          ctx.log.info(`watermark-mrxn: item[${i}] blind watermark embedded`)
        }

        ctx.output[i].buffer = buffer
        if (ctx.output[i].base64Image) {
          ctx.output[i].base64Image = buffer.toString('base64')
        }
      } catch (err) {
        ctx.log.error(`watermark-mrxn: item[${i}] failed: ${err.message}`)
      }
    }

    return ctx
  }

  const config = ctx => {
    const current = ctx.getConfig(`picgo-plugin-${PLUGIN_NAME}`) || {}
    return [
      {
        name: 'enableVisible',
        type: 'confirm',
        message: '启用可见文本水印',
        default: current.enableVisible !== false,
      },
      {
        name: 'visibleText',
        type: 'input',
        message: '水印文本',
        default: current.visibleText || '请勿商用',
        when: answers => answers.enableVisible,
      },
      {
        name: 'colorR',
        type: 'input',
        message: '水印颜色 R (0-255)',
        default: String(current.colorR != null ? current.colorR : 255),
        validate: v => /^\d{1,3}$/.test(v) && +v <= 255 ? true : '0-255',
        filter: v => parseInt(v, 10),
        when: answers => answers.enableVisible,
      },
      {
        name: 'colorG',
        type: 'input',
        message: '水印颜色 G (0-255)',
        default: String(current.colorG != null ? current.colorG : 160),
        validate: v => /^\d{1,3}$/.test(v) && +v <= 255 ? true : '0-255',
        filter: v => parseInt(v, 10),
        when: answers => answers.enableVisible,
      },
      {
        name: 'colorB',
        type: 'input',
        message: '水印颜色 B (0-255)',
        default: String(current.colorB != null ? current.colorB : 122),
        validate: v => /^\d{1,3}$/.test(v) && +v <= 255 ? true : '0-255',
        filter: v => parseInt(v, 10),
        when: answers => answers.enableVisible,
      },
      {
        name: 'alpha',
        type: 'input',
        message: '水印透明度 (0-255, 0=全透明)',
        default: String(current.alpha != null ? current.alpha : 110),
        validate: v => /^\d{1,3}$/.test(v) && +v <= 255 ? true : '0-255',
        filter: v => parseInt(v, 10),
        when: answers => answers.enableVisible,
      },
      {
        name: 'rotateDegree',
        type: 'input',
        message: '水印旋转角度 (如 -26)',
        default: String(current.rotateDegree != null ? current.rotateDegree : -26),
        filter: v => parseFloat(v),
        when: answers => answers.enableVisible,
      },
      {
        name: 'fontSize',
        type: 'input',
        message: '字体大小 (0=自适应)',
        default: String(current.fontSize || 0),
        filter: v => parseInt(v, 10),
        when: answers => answers.enableVisible,
      },
      {
        name: 'stepScaleX',
        type: 'input',
        message: '水平间距倍数',
        default: String(current.stepScaleX || 1.6),
        filter: v => parseFloat(v),
        when: answers => answers.enableVisible,
      },
      {
        name: 'stepScaleY',
        type: 'input',
        message: '垂直间距倍数',
        default: String(current.stepScaleY || 1.6),
        filter: v => parseFloat(v),
        when: answers => answers.enableVisible,
      },
      {
        name: 'staggerRatio',
        type: 'input',
        message: '奇数行交错比例 (0-1)',
        default: String(current.staggerRatio != null ? current.staggerRatio : 0.5),
        filter: v => parseFloat(v),
        when: answers => answers.enableVisible,
      },
      {
        name: 'enableBlind',
        type: 'confirm',
        message: '启用盲水印',
        default: current.enableBlind !== false,
      },
      {
        name: 'blindPayload',
        type: 'input',
        message: '盲水印内容 (隐藏信息)',
        default: current.blindPayload || 'watermark-pro|v1',
        when: answers => answers.enableBlind,
      },
      {
        name: 'blindPassword',
        type: 'input',
        message: '盲水印密钥',
        default: current.blindPassword || '136677',
        when: answers => answers.enableBlind,
      },
      {
        name: 'blindStrength',
        type: 'input',
        message: '盲水印强度 (1-10, 越大越鲁棒但越可见)',
        default: String(current.blindStrength || 3),
        validate: v => /^\d{1,2}$/.test(v) && +v >= 1 && +v <= 10 ? true : '1-10',
        filter: v => parseInt(v, 10),
        when: answers => answers.enableBlind,
      },
      // PicList second uploader settings
      {
        name: 'secondUploaderMode',
        type: 'list',
        message: 'PicList 第二图床水印模式（仅独立模式生效）',
        choices: [
          { name: '与主图床一致 (same)', value: 'same' },
          { name: '跳过所有水印 (skip)', value: 'skip' },
          { name: '仅可见水印 (visibleOnly)', value: 'visibleOnly' },
          { name: '仅盲水印 (blindOnly)', value: 'blindOnly' },
        ],
        default: current.secondUploaderMode || 'same',
        when: answers => answers.enableVisible || answers.enableBlind,
      },
    ]
  }

  const register = () => {
    ctx.helper.beforeUploadPlugins.register(PLUGIN_NAME, { handle })
  }

  const guiMenu = ctx => [
    {
      label: '⚠️ 使用须知',
      handle: (ctx, guiApi) => {
        guiApi.showMessageBox({
          title: '水印插件使用须知',
          message: [
            '本插件与 PicList 自带的「文字水印」和「图片水印」功能冲突。',
            '',
            '使用本插件前，请先在 PicList 设置中关闭自带水印功能，',
            '否则会出现重复水印，且盲水印可能失效。',
            '',
            '推荐处理链：格式转换 → 压缩 → EXIF清理 → [本插件] → 上传',
          ].join('\n'),
          type: 'warning',
        })
      },
    },
    {
      label: '📋 第二图床说明',
      handle: (ctx, guiApi) => {
        guiApi.showMessageBox({
          title: 'PicList 第二图床水印说明',
          message: [
            '当 PicList 启用「第二图床」时，水印行为取决于图床模式：',
            '',
            '【独立模式】',
            '  第二图床的上传会重新执行完整的插件处理流程。',
            '  插件可通过「第二图床水印模式」设置来控制行为：',
            '  • same — 与主图床一致（默认）',
            '  • skip — 跳过所有水印',
            '  • visibleOnly — 仅添加可见水印',
            '  • blindOnly — 仅添加盲水印',
            '',
            '【备份模式】',
            '  第二图床直接使用主图床已处理好的图片（含水印），',
            '  不再经过插件处理，因此无法单独控制。',
            '  如需第二图床不加水印，请改用「独立模式」。',
          ].join('\n'),
          type: 'info',
        })
      },
    },
  ]

  return {
    register,
    config,
    guiMenu,
  }
}
