import React, { useState, useEffect } from 'react';

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
    // 重置选中状态
    setSelectedIndex(-1);
    
    try {
      // 这里模拟API调用，实际项目中需要替换为真实的API请求
      // const response = await fetch('/api/generate-summary');
      // const data = await response.json();
      
      // 模拟数据
      const mockSummary = `本篇论文讨论了医疗健康领域中的伦理机器学习。
机器学习模型在医疗预测中存在偏见，可能加剧健康不平等。
作者提出了一个基于社会公正的ML伦理框架。
该研究分析了ML在健康领域的问题，从数据选择到部署后监控。
文章总结了实现公平ML的建议，强调了跨学科合作的重要性。`;
      
      setSummary(mockSummary);
      // 将摘要分割成句子
      const sentenceList = mockSummary.split(/(?<=[.。!！?？])\s*/);
      setSentences(sentenceList);
      
    } catch (err) {
      setError("生成摘要时出错，请重试");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 组件加载时自动生成摘要
  useEffect(() => {
    generateSummary();
  }, []);

  // 处理句子点击
  const handleSentenceClick = (sentence, index) => {
    // 更新选中的索引
    setSelectedIndex(index);
    
    if (onSentenceClick) {
      onSentenceClick(sentence);
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
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
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
            {sentence}
          </p>
        ))}
      </div>
    </div>
  );
};

export default Summary; 