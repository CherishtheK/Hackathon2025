import React, { useState, useEffect } from 'react';
import { throttledOpenAI, callWithRetry } from '../utils/apiUtils';

// 在组件外部定义缓存对象
const summaryCache = {};

const Summary = ({ onSentenceClick, currentDocument }) => {
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
    if (loading || !currentDocument) return;
    
    setLoading(true);
    setError(null);
    setSelectedIndex(-1);
    
    try {
      // 构建JSON文件路径
      const jsonFilename = currentDocument.name.replace(/\.pdf$/, '_structured.json');
      const jsonPath = `/json/${jsonFilename}`;
      console.log("Attempting to load JSON file:", jsonPath);
      
      // 获取PDF数据
      const response = await fetch(jsonPath);
      console.log("JSON request status:", response.status, response.statusText);
      if (!response.ok) {
        throw new Error(`Failed to load JSON: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Loaded JSON data:", data);
      
      if (!data.content || !Array.isArray(data.content)) {
        throw new Error("JSON data format is incorrect, missing content array");
      }
      
      const blocks = data.content;
      console.log(`Total block count: ${blocks.length}`);
      
      // 根据配置决定处理多少文本块
      let limitedBlocks;
      if (processFullDocument) {
        // 处理全文，但限制在1000个块以防止过大调用
        limitedBlocks = blocks.slice(0, Math.min(blocks.length, 1000));
        console.log(`Processing full document: ${limitedBlocks.length} blocks`);
      } else {
        // 只处理用户指定数量的块
        limitedBlocks = blocks.slice(0, blockLimit);
        console.log(`Processing part of document: ${limitedBlocks.length} blocks`);
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
        setError("Warning: Text too long, may exceed API limit. Please reduce block count or process in segments.");
        setLoading(false);
        return;
      }
      
      // 生成缓存键
      const cacheKey = currentDocument.id + "-" + 
                      (processFullDocument ? "full-" : "") + 
                      limitedBlocks.length + "-" + 
                      maxTokens;
      
      // 检查缓存
      if (summaryCache[cacheKey] && !force) {
        console.log('Using cached summary result');
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
              content: `Generate comprehensive paragraph-style summary, ensuring coverage of all main content and points of the document, using科普有趣的语言风格。
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
              content: `Please thoroughly analyze the following papers content, generating detailed paragraph-style summary, ensuring complete coverage of the entire document and all key points:
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
        // 按段落分割
        const paragraphs = text.split(/\n{2,}/);
        paragraphs.forEach((para) => {
          // 查找末尾的 [数字,数字,...]
          const citationMatch = para.match(/\[([0-9,\s]+)\]\s*\.?$/);
          let citations = [];
          let paraText = para;
          if (citationMatch) {
            citations = citationMatch[1].split(',').map(idx => parseInt(idx.trim())).filter(idx => !isNaN(idx));
            paraText = para.replace(/\[([0-9,\s]+)\]\s*\.?$/, '').trim();
          }
          result.push({
            text: paraText,
            citations: citations
          });
        });
        return result.length > 0 ? result : [{text: "Failed to parse summary content, please try again", citations: []}];
      };

      const parsedSentences = parseWithCitations(summaryText);
      setSentences(parsedSentences);
      
      // 存入缓存
      summaryCache[cacheKey] = {
        summary: summaryText,
        sentences: parsedSentences
      };
    } catch (err) {
      console.error("生成摘要时出错:", err);
      setError(err.message || "Error generating summary, please try again");
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
        // 修正：确保所有引用索引为有效数字且不为NaN
        const validCitations = Array.isArray(sentence.citations)
          ? sentence.citations.filter(idx => typeof idx === 'number' && !isNaN(idx))
          : [];
        console.log('引用段落索引:', validCitations);
        onSentenceClick(sentence.text, validCitations);
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
            disabled={!currentDocument || loading}
          >
            {loading ? "Generating..." : "Generate"}
          </button>
          <button 
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            onClick={() => generateSummary(true)}
            disabled={!currentDocument || loading}
          >
            Regenerate
          </button>
        </div>
        <button 
          className="text-sm text-gray-500 hover:text-gray-700"
          onClick={() => setShowConfig(!showConfig)}
        >
          ⚙️ Config
        </button>
      </div>
      
      {showConfig && (
        <div className="mb-4 p-3 bg-gray-100 rounded border border-gray-300">
          <h3 className="text-sm font-medium mb-2">Adjust Processing Parameters</h3>
          <div className="space-y-2">
            <div>
              <label className="block text-sm text-gray-600">
                Block Limit ({blockLimit} blocks)
              </label>
              <input
                type="range"
                min="10"
                max="100"
                value={blockLimit}
                onChange={(e) => setBlockLimit(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600">
                Max Tokens ({maxTokens})
              </label>
              <input
                type="range"
                min="1000"
                max="4000"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={processFullDocument}
                onChange={(e) => setProcessFullDocument(e.target.checked)}
                className="mr-2"
              />
              <label className="text-sm text-gray-600">
                Process full document (may be slow)
              </label>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="text-red-500 mb-4 p-3 bg-red-50 rounded">
          {error}
        </div>
      )}

      {processedTextInfo.blockCount > 0 && (
        <div className="text-xs text-gray-500 mb-4">
          Processing info: {processedTextInfo.blockCount}/{processedTextInfo.totalBlocks} blocks | 
          {processedTextInfo.wordCount} words | 
          {Math.round(processedTextInfo.characterCount/1024)}KB
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-gray-500">Generating summary, please wait...</p>
          </div>
        ) : sentences.length > 0 ? (
          <div className="space-y-4">
            {sentences.map((sentence, index) => (
              <div
                key={index}
                className={`p-3 rounded cursor-pointer transition-colors ${
                  selectedIndex === index ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
                }`}
                onClick={() => handleSentenceClick(sentence, index)}
                data-sentence={sentence.text}
                data-citations={JSON.stringify(
                  Array.isArray(sentence.citations)
                    ? sentence.citations.filter(idx => typeof idx === 'number' && !isNaN(idx))
                    : []
                )}
              >
                <p className="text-gray-800">{sentence.text}</p>
                <div className="text-xs text-gray-500 mt-1">
                  Cited blocks: {
                    Array.isArray(sentence.citations)
                      ? sentence.citations.filter(idx => typeof idx === 'number' && !isNaN(idx)).join(', ')
                      : ''
                  }
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">
            {currentDocument ? 'Click "Generate" to process the document' : 'Please select a document first'}
          </div>
        )}
      </div>
    </div>
  );
};

export default Summary; 