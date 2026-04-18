const { applyVisibleWatermark } = require('./visible-watermark')
const { embedBlindWatermark } = require('./blind-watermark')

const PLUGIN_NAME = 'watermark-mrxn'

module.exports = ctx => {
  const handle = async ctx => {
    const config = ctx.getConfig(`picgo-plugin-${PLUGIN_NAME}`) || {}
    const enableVisible = config.enableVisible !== false
    const enableBlind = config.enableBlind !== false

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
  ]

  return {
    register,
    config,
    guiMenu,
  }
}
