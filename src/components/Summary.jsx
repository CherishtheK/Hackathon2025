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

  // 生成摘要的函数
  const generateSummary = async () => {
    setLoading(true);
    setError(null);
    setSelectedIndex(-1);
    
    try {
      // 获取PDF数据
      const response = await fetch("/annurev-biodatasci-092820-114757_structured.json");
      const blocks = await response.json();
      
      // 简单取前5个块，减少token使用
      const limitedBlocks = blocks.slice(0, 5);
      const textContent = limitedBlocks.map(block => block.text).join("\n");
      
      // 生成缓存键
      const cacheKey = limitedBlocks.map(b => b.text.substring(0, 20)).join('');
      
      // 检查缓存
      if (summaryCache[cacheKey]) {
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
              content: `生成简短摘要，并标明每句话引用的原文段落。
              输出格式示例：
              1. 这是第一句摘要。[0,2]
              2. 这是第二句摘要。[1,4]` 
            },
            { 
              role: "user", 
              content: `请为以下标有索引的论文内容生成摘要，并在每句后标明引用的段落索引：
              [0] ${limitedBlocks[0].text}
              [1] ${limitedBlocks[1].text}
              [2] ${limitedBlocks[2].text}
              [3] ${limitedBlocks[3].text}
              [4] ${limitedBlocks[4].text}`
            }
          ],
          max_tokens: 200,
          temperature: 0.3
        }
      ));
      
      const summaryText = summaryResponse.data.choices[0].message.content;
      setSummary(summaryText);
      
      // 解析带引用的句子
      const parseWithCitations = (text) => {
        const result = [];
        // 匹配类似"这是一句话。[1,2,3]"或"1. 这是一句话 [1,2]"的格式
        const regex = /(.*?)\s*\[([0-9,\s]+)\]/g;
        let match;
        
        while ((match = regex.exec(text)) !== null) {
          const sentence = match[1].trim();
          // 解析引用索引
          const citations = match[2].split(',').map(idx => parseInt(idx.trim()));
          
          result.push({
            text: sentence,
            citations: citations
          });
        }
        
        return result.length > 0 ? result : text.split(/(?<=[.。!！?？])\s*/).filter(s => s.trim());
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

  // 组件加载时自动生成摘要
  // useEffect(() => {
  //   generateSummary();
  // }, []);

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

  if (loading) {
    return <div className="text-center p-4">正在生成摘要...</div>;
  }

  if (error) {
    return (
      <div className="text-center p-4 text-red-500">
        {error}
        <button 
          className="ml-2 px-3 py-1 bg-blue-500 text-white rounded"
          onClick={generateSummary}
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="summary-container">
      <div className="mb-4">
        <button 
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={generateSummary}
        >
          重新生成摘要
        </button>
      </div>

      <div className="summary-content">
        {sentences.map((sentence, index) => (
          <p 
            key={index}
            className={`mb-2 p-2 cursor-pointer hover:bg-gray-100 rounded transition-colors
                      ${selectedIndex === index ? 'selected' : ''}`}
            onClick={() => handleSentenceClick(sentence, index)}
          >
            {typeof sentence === 'object' ? sentence.text : sentence}
            {typeof sentence === 'object' && sentence.citations && (
              <span className="text-xs text-gray-500 ml-1">
                [{sentence.citations.join(',')}]
              </span>
            )}
          </p>
        ))}
      </div>
    </div>
  );
};

export default Summary; 