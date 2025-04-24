import React, { useState } from 'react';
import { throttledOpenAI } from '../utils/apiUtils';

function Chat({ documentContent = '' }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    // 添加用户消息
    const userMessage = { role: 'user', content: input };
    setMessages([...messages, userMessage]);
    setInput('');
    setLoading(true);
    
    try {
      // 构建聊天上下文
      const context = documentContent ? 
        `以下是文档内容片段：${documentContent.substring(0, 1000)}...` : 
        "用户正在讨论当前文档";
      
      const chatMessages = [
        { role: 'system', content: `你是一个助手，帮助用户理解文档内容。${context}` },
        ...messages,
        userMessage
      ];
      
      // 调用API
      const response = await throttledOpenAI.post(
        '/openai/deployments/gpt-4/chat/completions?api-version=2025-01-01-preview',
        {
          messages: chatMessages,
          max_tokens: 500,
          temperature: 0.7
        }
      );
      
      // 添加AI回复
      const aiMessage = { 
        role: 'assistant', 
        content: response.data.choices[0].message.content 
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error("聊天请求失败:", error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '抱歉，处理您的请求时出错了。请稍后再试。' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* 聊天消息区域 - 可滚动，添加底部内边距留出输入框空间 */}
      <div 
        className="overflow-y-auto w-full p-4 space-y-4 absolute top-0 bottom-0 left-0 right-0"
        style={{ paddingBottom: "80px" }} // 关键：留出足够空间给底部输入框
      >
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`px-4 py-2 rounded-lg max-w-xs lg:max-w-md break-words
              ${msg.role === 'user' ? 'bg-blue-100 text-blue-900' : 'bg-gray-200 text-gray-900'}`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-200 px-4 py-2 rounded-lg">
              <span className="animate-pulse">AI思考中...</span>
            </div>
          </div>
        )}
      </div>
      
      {/* 输入区域 - 固定定位在底部 */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-white shadow-md">
        <div className="flex">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            className="flex-1 px-3 py-2 border rounded-l text-sm focus:outline-none focus:ring"
            placeholder="问点什么..."
          />
          <button 
            onClick={sendMessage}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded-r disabled:bg-blue-300"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
}

export default Chat;
