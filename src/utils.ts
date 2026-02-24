// 检查URL连通性
export const checkUrlConnectivity = async (url: string) => {
  const { reject, resolve, promise } = Promise.withResolvers()
  const res = await fetch(url, { method: 'HEAD' }).catch((error) => {
    // console.error(`❌ Error accessing ${url}:`, error)
    return false
  })
  //@ts-ignore
  resolve(!!(res?.ok && res?.url === url))
  return promise
}

// 测试URL的连通性和延迟
export const testingUrlConnectivityAndLatency = async (url: string, testTimes = 3) => {
  const testTime = Math.max(1, testTimes) // 确保测试次数至少为1

  const results = (
    await Promise.allSettled(
      Array.from({ length: testTime }, async () => {
        const start = performance.now()
        console.log(`       ${url}`)
        const result = await checkUrlConnectivity(url)
        const end = performance.now()
        const latency = (end - start).toFixed(2)
        return { result, latency }
      })
    )
  ).map((r) => {
    if (r.status === 'fulfilled') {
      return r.value
    }
    return { result: false, latency: 'N/A' }
  })
  const successfulTests = results.filter((r) => r.result).length // 成功的测试次数
  const averageLatency = (results.reduce((sum, r) => sum + parseFloat(r.latency), 0) / testTime).toFixed(2) // 平均延迟
  const successfulLatencies = results.filter((r) => r.result).map((r) => parseFloat(r.latency)) // 成功测试的延迟数组
  const averageSuccessfulLatency = successfulLatencies.length > 0 ? (successfulLatencies.reduce((sum, latency) => sum + latency, 0) / successfulLatencies.length).toFixed(2) : 'N/A' // 成功测试的平均延迟

  return {
    url, // 测试的URL
    successfulTests, // 成功的测试次数
    totalTest: testTime, // 总测试次数
    averageLatency: `${averageLatency}ms`, // 平均延迟
    results: results.map(({ result, latency }, index) => `第${index + 1}次测试结果: ${result}, 延迟: ${latency}ms`), // 每次测试的结果和延迟
    successfulLatencies, // 成功测试的延迟数组
    averageSuccessfulLatency: averageSuccessfulLatency === 'N/A' ? 'N/A' : `${averageSuccessfulLatency}ms` // 成功测试的平均延迟
  }
}
