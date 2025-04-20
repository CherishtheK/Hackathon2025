// src/components/MarkdownViewer.jsx
import React, { useEffect, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";

const MarkdownViewer = ({ highlightText }) => {
  const [blocks, setBlocks] = useState([]);
  const [highlightedBlocks, setHighlightedBlocks] = useState([]);
  // 用于存储高亮块的引用
  const highlightedRefs = useRef({});

  useEffect(() => {
    // 从JSON文件获取Markdown数据
    fetch("/annurev-biodatasci-092820-114757_structured.json")
      .then((res) => res.json())
      .then((data) => {
        setBlocks(data);
        console.log("成功加载PDF数据，共有", data.length, "个块");
      })
      .catch(err => {
        console.error("加载PDF数据失败:", err);
      });
  }, []);

  // 当highlightText变化时，查找匹配的文本块
  useEffect(() => {
    if (!highlightText) {
      setHighlightedBlocks([]);
      return;
    }

    // 查找包含highlightText的块
    const matches = blocks.filter(block => 
      block.text.toLowerCase().includes(highlightText.toLowerCase())
    );
    
    setHighlightedBlocks(matches.map(block => block.text));
    
    // 如果找到了匹配的块，滚动到第一个匹配的块
    setTimeout(() => {
      if (matches.length > 0) {
        const firstMatchText = matches[0].text;
        const ref = highlightedRefs.current[firstMatchText];
        if (ref) {
          // 平滑滚动到视图
          ref.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' // 滚动使元素在容器的中间对齐
          });
        }
      }
    }, 100); // 短暂延迟以确保DOM已更新
  }, [highlightText, blocks]);

  return (
    <div className="markdown-content">
      {blocks.map((block, idx) => {
        // 检查当前块是否需要高亮
        const shouldHighlight = highlightText && 
          block.text.toLowerCase().includes(highlightText.toLowerCase());
        
        return (
          <div 
            key={idx} 
            className={`markdown-block ${shouldHighlight ? 'highlighted' : ''}`}
            // 如果是高亮块，存储其引用
            ref={el => {
              if (shouldHighlight) {
                highlightedRefs.current[block.text] = el;
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
