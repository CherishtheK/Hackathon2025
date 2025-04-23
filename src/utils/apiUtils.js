import axios from 'axios';

// 实现指数退避重试
export const callWithRetry = async (apiCall, maxRetries = 3) => {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      return await apiCall();
    } catch (error) {
      if (error.response && error.response.status === 429) {
        // 修改apiUtils.js
        // 更改为分钟级重试间隔
        const waitTime = (retries + 1) * 60000; // 1分钟、2分钟、3分钟
        console.log(`速率限制，等待${waitTime/60000}分钟后重试...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        retries++;
      } else {
        throw error; // 非429错误直接抛出
      }
    }
  }
  
  throw new Error(`达到最大重试次数(${maxRetries})后仍失败`);
};

// 节流API调用的实例
export const throttledOpenAI = axios.create();

// 最近的请求时间
let lastRequestTime = 0;
const minRequestInterval = 1000; // 最小请求间隔1秒

// 添加请求拦截器实现节流
throttledOpenAI.interceptors.request.use(async (config) => {
  const now = Date.now();
  const timeElapsed = now - lastRequestTime;
  
  if (timeElapsed < minRequestInterval) {
    // 等待直到满足最小间隔
    await new Promise(resolve => 
      setTimeout(resolve, minRequestInterval - timeElapsed)
    );
  }
  
  lastRequestTime = Date.now();
  return config;
});
