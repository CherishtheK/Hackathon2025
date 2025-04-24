import React, { useState, useEffect } from "react";
import { List, Grid, ChevronLeft } from "lucide-react";
import MarkdownViewer from "./MarkdownViewer";
import Summary from "./Summary";

// 添加WindowShell组件定义
function WindowShell({ children, title }) {
  return (
    <div className="bg-gray-200 h-screen w-screen flex items-center justify-center">
      <div className="w-[1280px] h-[800px] bg-white rounded-xl shadow-lg overflow-hidden border border-gray-300 flex flex-col">
        <header className="h-10 bg-gray-100 border-b border-gray-300 flex items-center justify-between px-4">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 bg-red-500 rounded-full inline-block" />
            <span className="w-3 h-3 bg-yellow-400 rounded-full inline-block" />
            <span className="w-3 h-3 bg-green-500 rounded-full inline-block" />
          </div>
          <div className="text-sm font-medium text-gray-700">{title}</div>
          <div className="w-12" />
        </header>
        <main className="flex-1 overflow-hidden relative">{children}</main>
      </div>
    </div>
  );
}

export default function KnowledgeBridge() {
  // 原有状态
  const [viewMode, setViewMode] = useState("grid");
  const [activeView, setActiveView] = useState("library");
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [expandedProject, setExpandedProject] = useState(null);
  
  // 添加的状态（连接Summary和MarkdownViewer）
  const [highlightText, setHighlightText] = useState("");
  const [citedBlockIndices, setCitedBlockIndices] = useState([]);
  
  // 处理摘要点击
  const handleSentenceClick = (text, citations) => {
    console.log("点击的摘要:", text);
    console.log("引用索引:", citations);
    
    setHighlightText(text);
    setCitedBlockIndices(citations || []);
  };
  
  return (
    <WindowShell title="Knowledge Bridge">
      {/* 侧边栏和其他UI保持不变 */}
      
      {/* 在detail视图中替换内容区域 */}
      {activeView === "detail" ? (
        <section className="flex-1 flex flex-col">
          <div className="flex items-center space-x-2 mb-4">
            <button onClick={() => setActiveView("library")}> 
              <ChevronLeft size={20} className="text-gray-700 hover:text-black" />
            </button>
            <h2 className="text-2xl font-semibold">Sex Differences in Long COVID</h2>
          </div>
          <div className="flex flex-1 border border-gray-200 rounded overflow-hidden divide-x">
            {/* 左栏: 原始PDF内容 */}
            <div className="w-1/3 h-full overflow-auto bg-gray-50 p-4">
              <h3 className="text-lg font-medium mb-2">原始文档</h3>
              <MarkdownViewer 
                highlightText={highlightText} 
                citedBlockIndices={citedBlockIndices} 
              />
            </div>
            
            {/* 中栏: AI摘要 */}
            <div className="w-1/3 h-full overflow-auto bg-white p-4">
              <h3 className="text-lg font-medium mb-2">AI摘要</h3>
              <Summary onSentenceClick={handleSentenceClick} />
            </div>
            
            {/* 右栏: AI聊天 - 保持不变 */}
            <div className="w-1/3 flex flex-col h-full bg-gray-50">
              {/* 聊天部分内容不变 */}
            </div>
          </div>
        </section>
      ) : (
        // 库视图内容保持不变
        <div>
    {/* 这里应该放置库视图的内容 */}
        <h2>库视图</h2>
        </div>
      )}
    </WindowShell>
  );
}
