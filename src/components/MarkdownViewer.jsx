// src/components/MarkdownViewer.jsx
import React, { useEffect, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";

const MarkdownViewer = ({ highlightText, citedBlockIndices = [] }) => {
  // 顶部定义清理函数
  const cleanText = (text) => {
    if (!text) return '';
    return text
      .replace(/[.,!?;:()[\]{}""''、。，！？；：（）【】]/g, ' ') // 替换更多标点为空格
      .toLowerCase()
      .replace(/\s+/g, ' ') // 将多个空格合并为一个
      .trim();
  };

  const [blocks, setBlocks] = useState([]);
  const [highlightedBlocks, setHighlightedBlocks] = useState([]);
  // 用于存储高亮块的引用
  const highlightedRefs = useRef({});

  useEffect(() => {
    // 从JSON文件获取Markdown数据
    fetch("/annurev-biodatasci-092820-114757_structured.json")
      .then((res) => res.json())
      .then((data) => {
        console.log('加载的JSON数据:', data.slice(0, 3)); // 只显示前3项
        setBlocks(data);
        console.log('原文文本示例:', data.slice(0, 5).map(b => b.text));
      })
      .catch(err => {
        console.error("加载PDF数据失败:", err);
      });
  }, []);

  // 当highlightText变化时，查找匹配的文本块
  useEffect(() => {
    console.log('MarkdownViewer收到的highlightText:', highlightText);
    console.log('MarkdownViewer收到的引用索引:', citedBlockIndices);
    
    if (!highlightText && citedBlockIndices.length === 0) {
      setHighlightedBlocks([]);
      return;
    }

    // 如果有引用索引，优先使用索引
    if (citedBlockIndices.length > 0) {
      const citedBlocks = citedBlockIndices
        .map(idx => blocks[idx]?.text)
        .filter(Boolean);
      
      console.log('基于引用索引找到的块:', citedBlocks);
      setHighlightedBlocks(citedBlocks);
      
      // 滚动到第一个引用块
      setTimeout(() => {
        if (citedBlockIndices.length > 0) {
          const firstCitedIdx = citedBlockIndices[0];
          const ref = highlightedRefs.current[firstCitedIdx];
          if (ref) {
            ref.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }, 100);
      return;
    }

    // 如果没有引用索引，回退到现有的文本匹配
    const cleanedHighlightText = cleanText(highlightText);
    console.log('清理后的搜索文本:', cleanedHighlightText);
    
    // 将搜索文本分解为关键词（词组）
    const searchTerms = cleanedHighlightText.split(' ').filter(term => term.length > 3);
    console.log('搜索关键词:', searchTerms);
    
    // 找出包含足够多关键词的块
    const matches = blocks.filter(block => {
      const cleanedBlockText = cleanText(block.text);
      const matchedTerms = searchTerms.filter(term => 
        cleanedBlockText.includes(term)
      );
      
      // 为一些块添加调试信息
      if (matchedTerms.length > 0) {
        console.log('块文本:', block.text);
        console.log('匹配关键词:', matchedTerms);
        console.log('匹配率:', matchedTerms.length / searchTerms.length);
      }
      
      return matchedTerms.length >= Math.ceil(searchTerms.length * 0.5);
    });
    
    console.log('找到匹配块数量:', matches.length);
    if(matches.length > 0) {
      console.log('第一个匹配块:', matches[0].text);
    }
    
    setHighlightedBlocks(matches.map(block => block.text));
    
    setTimeout(() => {
      if (matches.length > 0) {
        const firstMatchText = matches[0].text;
        console.log('要滚动到的文本:', firstMatchText);
        console.log('现有引用:', Object.keys(highlightedRefs.current));
        const matchIndex = blocks.findIndex(b => b.text === firstMatchText);
        const ref = highlightedRefs.current[matchIndex];
        console.log('找到引用?', !!ref);
        if (ref) {
          ref.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }, 100);
  }, [highlightText, citedBlockIndices, blocks]);

  return (
    <div className="markdown-content h-full overflow-auto">
      {blocks.map((block, idx) => {
        // 使用两种高亮判断方式
        const isHighlightedByIndex = citedBlockIndices.includes(idx);
        const isHighlightedByText = highlightText && 
          cleanText(block.text).includes(cleanText(highlightText));
        
        const shouldHighlight = isHighlightedByIndex || isHighlightedByText;
        
        return (
          <div 
            key={idx} 
            className={`markdown-block ${shouldHighlight ? 'highlighted' : ''}`}
            ref={el => {
              if (shouldHighlight) {
                highlightedRefs.current[idx] = el;
              }
            }}
          >
            <ReactMarkdown>
          {block.markdown + block.text}
        </ReactMarkdown>
          </div>
        );
      })}
      
      {blocks.length === 0 && (
        <div className="text-center p-8 text-gray-500">
          正在加载文档内容...
        </div>
      )}
    </div>
  );
};

export default MarkdownViewer;
