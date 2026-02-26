import Bun from 'bun'
import data from './data'
import { testingUrlConnectivityAndLatency, generateVodstream } from './utils'
import { chunk } from 'es-toolkit'
import { nanoid } from 'nanoid'

const size = 100 // 每批处理的URL数量

// 给 vod 数组中的每个URL进行测试，并将结果根据成功的测试次数和成功测试的平均延迟排序然后输出到文件中

const results = []
for (const group of chunk(data, size)) {
  let res = (
    await Promise.allSettled(
      group.map(async ([name, url]) => {
        const result = await testingUrlConnectivityAndLatency(url, { testTotal: 3, parallel: false, name })
        return { name, ...result }
      })
    )
  ).map((r) => {
    if (r.status === 'fulfilled') {
      return r.value
    }
    return null
  })
  results.push(...res.filter((r) => r !== null))
}

// 根据成功的测试次数和成功测试的平均延迟排序
results.sort((a, b) => {
  if (b.successfulTests === a.successfulTests) {
    return parseFloat(a.averageSuccessfulLatency) - parseFloat(b.averageSuccessfulLatency)
  }
  return b.successfulTests - a.successfulTests
})
// 分别处理成功和失败的结果
const successResults: Record<'title' | 'value' | 'remark', string>[] = []
const errorResults: Record<'title' | 'value' | 'remark', string>[] = []

results.forEach(({ name, url, successfulTests, totalTest, averageLatency, averageSuccessfulLatency }) => {
  const resultItem = {
    title: name,
    value: url,
    remark: `成功测试: ${successfulTests}/${totalTest}，平均延迟: ${averageLatency}，成功测试的平均延迟: ${averageSuccessfulLatency}`
  }

  if (parseFloat(averageSuccessfulLatency) <= 1500) {
    successResults.push(resultItem)
  } else {
    errorResults.push(resultItem)
  }
})

const successResultsNoRemark = successResults.map(({ title, value }) => ({ title, value }))
const errorResultsNoRemark = errorResults.map(({ title, value }) => ({ title, value }))

const successResultsCsv = successResults.map(({ title, value, remark }) => `${title},${value},${remark}`).join('\n')
const errorResultsCsv = errorResults.map(({ title, value, remark }) => `${title},${value},${remark}`).join('\n')

const successResultsCsvNoRemark = successResultsNoRemark.map(({ title, value }) => `${title},${value}`).join('\n')
const errorResultsCsvNoRemark = errorResultsNoRemark.map(({ title, value }) => `${title},${value}`).join('\n')

// 输出结果到文件
await Bun.write('./dist/sucess_remark.json', JSON.stringify(successResults, null, 2))
await Bun.write('./dist/error_remark.json', JSON.stringify(errorResults, null, 2))
await Bun.write('./dist/sucess.json', JSON.stringify(successResultsNoRemark, null, 2))
await Bun.write('./dist/error.json', JSON.stringify(errorResultsNoRemark, null, 2))
await Bun.write('./dist/sucess_remark.csv', successResultsCsv)
await Bun.write('./dist/error_remark.csv', errorResultsCsv)
await Bun.write('./dist/sucess.csv', successResultsCsvNoRemark)
await Bun.write('./dist/error.csv', errorResultsCsvNoRemark)
await Bun.write('./dist/vodstream.js', await generateVodstream(successResultsCsvNoRemark))
await Bun.write(
  './dist/kvideo-settings.json',
  JSON.stringify(
    {
      settings: {
        sources: successResultsNoRemark.map((v, i) => ({
          id: `[${v.title}]-${nanoid(8)}`,
          name: v.title,
          baseUrl: v.value,
          searchPath: '',
          detailPath: '',
          enabled: true,
          priority: i + 1
        })),
        premiumSources: [],
        subscriptions: [],
        sortBy: 'default',
        searchHistory: true,
        watchHistory: true,
        autoNextEpisode: true,
        autoSkipIntro: false,
        skipIntroSeconds: 0,
        autoSkipOutro: false,
        skipOutroSeconds: 0,
        showModeIndicator: false,
        adFilter: false,
        adFilterMode: 'heuristic',
        adKeywords: [],
        realtimeLatency: false,
        searchDisplayMode: 'normal',
        episodeReverseOrder: false,
        fullscreenType: 'auto',
        proxyMode: 'retry',
        rememberScrollPosition: true,
        personalizedRecommendations: true,
        danmakuEnabled: false,
        danmakuApiUrl: 'https://api.dandanplay.net',
        danmakuOpacity: 0.7,
        danmakuFontSize: 20,
        danmakuDisplayArea: 0.5
      }
    },
    null,
    2
  )
)
await Bun.write(
  './dist/changelog.md',
  `## 延迟不超过1500ms

### csv

\`\`\`csv
${successResultsCsv}
\`\`\`

### json

\`\`\`json
${JSON.stringify(successResults, null, 2)}
\`\`\`
`
)
console.log(`延迟不超过1500ms的URL已保存到 ./dist/sucess_remark.json (${successResults.length}个)`)
console.log(`延迟超过1500ms的URL已保存到 ./dist/error_remark.json (${errorResults.length}个)`)
