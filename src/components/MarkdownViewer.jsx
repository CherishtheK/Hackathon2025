// src/components/MarkdownViewer.jsx
import React, { useEffect, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";

const MarkdownViewer = ({ highlightText }) => {
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
    
    if (!highlightText) {
      setHighlightedBlocks([]);
      return;
    }

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
  }, [highlightText, blocks]);

  return (
    <div className="markdown-content">
      {blocks.map((block, idx) => {
        // 使用相同的清理函数判断是否需要高亮
        const shouldHighlight = highlightText && (() => {
          const cleanedBlockText = cleanText(block.text);
          const cleanedHighlightText = cleanText(highlightText);
          const searchTerms = cleanedHighlightText.split(' ').filter(term => term.length > 3);
          const matchedTerms = searchTerms.filter(term => 
            cleanedBlockText.includes(term)
          );
          return matchedTerms.length >= Math.ceil(searchTerms.length * 0.5);
        })();
        
        // 对第一个块进行额外调试
        if (idx === 0) {
          console.log('第一个块是否高亮:', shouldHighlight);
          console.log('清理后的块文本:', cleanText(block.text));
          console.log('清理后的搜索文本:', cleanText(highlightText));
        }
        
        return (
          <div 
            key={idx} 
            className={`markdown-block ${shouldHighlight ? 'highlighted' : ''}`}
            // 如果是高亮块，存储其引用
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
