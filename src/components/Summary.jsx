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
  const [processFullDocument, setProcessFullDocument] = useState(false);

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
      const blocks = await response.json();
      
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
              content: `生成全面的段落式摘要，确保涵盖文档的所有主要内容和观点。每个段落应包含丰富的内容和深入的分析。
              每个段落后清晰地标明引用的原文段落索引。
              不要限制段落数量，应根据内容的复杂性和丰富度生成足够数量的段落，确保完整覆盖全文的关键点。
              
              输出格式示例：
              1. 第一段摘要内容...[相关段落索引]
              2. 第二段摘要内容...[相关段落索引]
              ...以此类推，直到完整覆盖文档的所有重要内容。
              
              确保根据原文内容自然划分段落主题，而不是人为限制段落数量。` 
            },
            { 
              role: "user", 
              content: `请彻底分析以下标有索引的论文内容，生成详尽的段落式摘要，确保完整覆盖全文内容和所有关键点：
              ${limitedBlocks.map((block, index) => `[${index}] ${block.text}`).join('\n\n')}` 
            }
          ],
          max_tokens: maxTokens,  // 使用用户配置的token上限
          temperature: 0.4   // 稍微提高温度以增加多样性
        }
      ));
      
      const summaryText = summaryResponse.data.choices[0].message.content;
      setSummary(summaryText);
      
      // 解析带引用的句子
      const parseWithCitations = (text) => {
        const result = [];
        // 改进正则表达式，更好地匹配段落式摘要
        // 可以匹配 "1. 这是一段详细的摘要内容，包含多个句子。这也是同一段的内容。[0,1,2]" 格式
        const regex = /(\d+\.\s*.*?)(?=\s*\[|\d+\.\s*|$)(\s*\[([0-9,\s]+)\])?/gs;
        
        let match;
        
        while ((match = regex.exec(text)) !== null) {
          // 句子文本（可能包含多个句子）
          const paragraphText = match[1].trim();
          // 引用索引部分
          const citationText = match[2] || '';
          
          console.log("匹配的段落:", paragraphText);
          console.log("引用部分:", citationText);
          
          // 提取引用索引
          const citationsMatch = /\[([0-9,\s]+)\]/.exec(citationText);
          const citations = citationsMatch 
            ? citationsMatch[1].split(',').map(idx => parseInt(idx.trim()))
            : [];
          
          result.push({
            text: paragraphText,
            citations: citations
          });
        }
        
        // 如果没有找到匹配项，则按照段落分割文本
        if (result.length === 0) {
          // 分割成段落，每个段落可能包含多个句子
          const paragraphs = text.split(/\n+/).filter(p => p.trim());
          return paragraphs.map(p => ({ text: p, citations: [] }));
        }
        
        console.log("解析出的段落数:", result.length);
        return result;
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

      <div className="summary-content flex-1 overflow-y-auto pr-2">
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