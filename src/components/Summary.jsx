import React, { useState, useEffect } from 'react';
import { throttledOpenAI, callWithRetry } from '../utils/apiUtils';

// 在组件外部定义缓存对象
const summaryCache = {};

const Summary = ({ onSentenceClick }) => {
  const [summary, setSummary] = useState("");
  const [sentences, setSentences] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // 追踪当前选中的句子索引
  const [selectedIndex, setSelectedIndex] = useState(-1);
  // 添加一个状态追踪是否已经初始化，防止多次调用
  const [initialized, setInitialized] = useState(false);
  // 添加状态追踪处理的原文信息
  const [processedTextInfo, setProcessedTextInfo] = useState({
    blockCount: 0,
    wordCount: 0,
    characterCount: 0,
    totalBlocks: 0
  });
  // 添加配置状态
  const [showConfig, setShowConfig] = useState(false);
  const [blockLimit, setBlockLimit] = useState(30);
  const [maxTokens, setMaxTokens] = useState(2500);
  const [processFullDocument, setProcessFullDocument] = useState(true);

  // 生成摘要的函数
  const generateSummary = async (force = false) => {
    // 防止重复调用
    if (loading) return;
    
    setLoading(true);
    setError(null);
    setSelectedIndex(-1);
    
    try {
      // 获取PDF数据
      const response = await fetch("/annurev-biodatasci-092820-114757_structured.json");
      console.log("JSON请求状态:", response.status, response.statusText);
      const blocks = await response.json();
      console.log("JSON第一个块内容:", blocks[0]);
      
      console.log(`文档总块数: ${blocks.length}`);
      
      // 根据配置决定处理多少文本块
      let limitedBlocks;
      if (processFullDocument) {
        // 处理全文，但限制在1000个块以防止过大调用
        limitedBlocks = blocks.slice(0, Math.min(blocks.length, 1000));
        console.log(`处理全文: ${limitedBlocks.length}个块`);
      } else {
        // 只处理用户指定数量的块
        limitedBlocks = blocks.slice(0, blockLimit);
        console.log(`处理部分文档: ${limitedBlocks.length}个块`);
      }
      
      const textContent = limitedBlocks.map(block => block.text).join("\n");
      
      // 计算并保存处理的文本信息
      const wordCount = textContent.split(/\s+/).length;
      const characterCount = textContent.length;
      setProcessedTextInfo({
        blockCount: limitedBlocks.length,
        wordCount,
        characterCount,
        totalBlocks: blocks.length
      });
      
      // 检查文本是否太大
      if (characterCount > 100000) {
        setError("警告：文本太长，可能超过API限制。请减少处理块数或分段处理。");
        setLoading(false);
        return;
      }
      
      // 生成缓存键
      const cacheKey = (processFullDocument ? "full-" : "") + 
                       limitedBlocks.map(b => b.text.substring(0, 20)).join('') + maxTokens;
      
      // 检查缓存
      if (summaryCache[cacheKey] && !force) {
        console.log('使用缓存的摘要结果');
        setSummary(summaryCache[cacheKey].summary);
        setSentences(summaryCache[cacheKey].sentences);
        setLoading(false);
        return;
      }
      
      // 使用自定义重试和节流工具
      const summaryResponse = await callWithRetry(() => throttledOpenAI.post(
        '/openai/deployments/gpt-4/chat/completions?api-version=2025-01-01-preview',
        {
          messages: [
            { 
              role: "system", 
              content: `生成全面的段落式摘要，确保涵盖文档的所有主要内容和观点,采用科普有趣的语言风格。
注意：摘要必须严格按照以下格式：
1. 第一段内容... [引用段落索引，如0,1,2]
2. 第二段内容... [引用段落索引，如3,4,5]
3. 第三段内容... [引用段落索引]
...

每个段落后必须紧跟方括号中的引用索引，不允许有无引用的段落。
引用格式必须是数字加逗号的形式，如[0,1,2]。
请至少生成5-10个段落，确保全面覆盖文档内容。` 
            },
            { 
              role: "user", 
              content: `请彻底分析以下标有索引的论文内容，生成详尽的段落式摘要，确保完整覆盖全文内容和所有关键点：
              ${limitedBlocks.map((block, index) => `[${index}] ${block.text}`).join('\n\n')}` 
            }
          ],
          max_tokens: maxTokens,  // 使用用户配置的token上限
          temperature: 0.7   // 增加变化性，可能产生更多内容
        }
      ));
      
      const summaryText = summaryResponse.data.choices[0].message.content;
      setSummary(summaryText);
      
      // 解析带引用的句子
      const parseWithCitations = (text) => {
        const result = [];
        
        // 先尝试常规格式匹配
        const regex = /(\d+\.\s*.*?)(?=\s*\[|\d+\.\s*|$)(\s*\[([0-9,\s]+)\])?/gs;
        let match;
        let foundAny = false;
        
        while ((match = regex.exec(text)) !== null) {
          foundAny = true;
          const paragraphText = match[1].trim();
          const citationText = match[2] || '';
          
          // 提取引用索引
          const citationsMatch = /\[([0-9,\s]+)\]/.exec(citationText);
          let citations = [];
          
          if (citationsMatch) {
            citations = citationsMatch[1].split(',').map(idx => parseInt(idx.trim()));
          } else {
            console.log("段落未找到引用:", paragraphText.substring(0, 50) + "...");
            citations = [0]; // 默认引用第一段
          }
          
          result.push({
            text: paragraphText,
            citations: citations
          });
        }
        
        // 如果标准格式没有匹配到任何内容，尝试备用解析方法
        if (!foundAny) {
          console.log("未能匹配标准格式，尝试备用解析");
          // 简单按段落分割
          const paragraphs = text.split(/\n\n+/);
          
          paragraphs.forEach((para, index) => {
            // 尝试查找末尾的引用格式 [x,y,z]
            const citationMatch = para.match(/\s*\[([0-9,\s]+)\]$/);
            let citations = [0]; // 默认引用
            let paraText = para;
            
            if (citationMatch) {
              citations = citationMatch[1].split(',').map(idx => parseInt(idx.trim()));
              paraText = para.replace(/\s*\[([0-9,\s]+)\]$/, '');
            }
            
            result.push({
              text: paraText.trim(),
              citations: citations
            });
          });
        }
        
        // 打印详细的解析结果以便调试
        console.log("API返回的原始文本:", text.substring(0, 200) + "...");
        console.log("总共解析了", result.length, "个段落");
        result.forEach((item, i) => {
          console.log(`段落${i+1}: ${item.text.substring(0, 50)}... 引用:${item.citations.join(',')}`);
        });
        
        console.log("完整的API响应文本:", text);
        console.log("正则表达式匹配结果:", match);
        
        return result.length > 0 ? result : [{text: "无法解析摘要内容，请重试", citations: [0]}];
      };

      const parsedSentences = parseWithCitations(summaryText);
      setSentences(parsedSentences);
      
      // 存入缓存
      summaryCache[cacheKey] = {
        summary: summaryText,
        sentences: parsedSentences
      };
    } catch (err) {
      setError("生成摘要时出错，请重试");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 处理句子点击
  const handleSentenceClick = (sentence, index) => {
    console.log('摘要句子被点击:', typeof sentence === 'object' ? sentence.text : sentence);
    setSelectedIndex(index);
    
    if (onSentenceClick) {
      if (typeof sentence === 'object' && sentence.citations) {
        console.log('引用段落索引:', sentence.citations);
        // 传递文本和引用
        onSentenceClick(sentence.text, sentence.citations);
      } else {
        onSentenceClick(sentence);
      }
    }
  };

  return (
    <div className="summary-container h-full flex flex-col">
      <div className="mb-4 flex justify-between items-center">
        <div>
          <button 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mr-2"
            onClick={() => generateSummary(false)}
          >
            生成详细摘要
          </button>
          <button 
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            onClick={() => generateSummary(true)}
          >
            强制重新生成
          </button>
        </div>
        <button 
          className="text-sm text-gray-500 hover:text-gray-700"
          onClick={() => setShowConfig(!showConfig)}
        >
          ⚙️ 配置
        </button>
      </div>
      
      {showConfig && (
        <div className="mb-4 p-3 bg-gray-100 rounded border border-gray-300">
          <h3 className="text-sm font-medium mb-2">调整处理参数</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">处理文本块数量</label>
              <div className="flex items-center">
                <input 
                  type="range" 
                  min="5" 
                  max="50" 
                  value={blockLimit} 
                  onChange={e => setBlockLimit(parseInt(e.target.value))} 
                  className="w-2/3 mr-2"
                  disabled={processFullDocument}
                />
                <span className="text-xs">{processFullDocument ? "全文" : blockLimit}</span>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">输出Token上限</label>
              <div className="flex items-center">
                <input 
                  type="range" 
                  min="500" 
                  max="4000" 
                  step="100"
                  value={maxTokens} 
                  onChange={e => setMaxTokens(parseInt(e.target.value))} 
                  className="w-2/3 mr-2"
                />
                <span className="text-xs">{maxTokens}</span>
              </div>
            </div>
          </div>
          <div className="mt-3">
            <label className="flex items-center">
              <input 
                type="checkbox" 
                checked={processFullDocument} 
                onChange={e => setProcessFullDocument(e.target.checked)}
                className="mr-2"
              />
              <span className="text-xs text-gray-700">处理全文（警告：可能增加处理时间和API消耗）</span>
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-2">提示: 增加文本块可处理更多内容，增加Token上限可生成更长摘要。</p>
        </div>
      )}
      
      {processedTextInfo.blockCount > 0 && (
        <div className="text-xs text-gray-500 mb-3 border-b pb-2">
          <div>
            处理信息: {processedTextInfo.blockCount} / {processedTextInfo.totalBlocks} 个文本块 
            ({Math.round(processedTextInfo.blockCount / processedTextInfo.totalBlocks * 100)}%)
          </div>
          <div>
            约 {processedTextInfo.wordCount} 个词 | {processedTextInfo.characterCount} 个字符
          </div>
          <div className="text-xs mt-1 italic">
            注: 一般每1000字符约消耗2-3个token
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500 mb-3">
        <span className="inline-flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded">
          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
          </svg>
          已启用全文总结
        </span>
      </div>

      <div 
        className="summary-content flex-1 overflow-y-auto pr-2"
        style={{height: "100%"}}
      >
        {loading ? (
          <div className="text-center p-4">正在生成详细摘要，这可能需要一点时间...</div>
        ) : sentences.length > 0 ? (
          sentences.map((sentence, index) => (
            <div 
              key={index}
              className={`mb-4 p-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow
                        ${selectedIndex === index ? 'border-blue-500 ring-2 ring-blue-200' : ''}`}
              onClick={() => handleSentenceClick(sentence, index)}
            >
              <p className="text-gray-800 leading-relaxed">
                {typeof sentence === 'object' ? sentence.text : sentence}
              </p>
              {typeof sentence === 'object' && sentence.citations && sentence.citations.length > 0 && (
                <div className="mt-2 text-xs text-gray-500">
                  引用段落: 
                  <span className="ml-1 font-mono bg-gray-100 px-1 py-0.5 rounded">
                    {sentence.citations.join(', ')}
                  </span>
                </div>
              )}
            </div>
          ))
        ) : error ? (
          <div className="text-center p-4 text-red-500">
            {error}
            <button 
              className="ml-2 px-3 py-1 bg-blue-500 text-white rounded"
              onClick={() => generateSummary(true)}
            >
              重试
            </button>
          </div>
        ) : (
          <div className="text-center p-4 text-gray-500">
            点击上方按钮生成详细摘要
          </div>
        )}
      </div>
    </div>
  );
};

export default Summary; 