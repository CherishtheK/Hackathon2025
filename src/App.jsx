import { useState } from 'react'
import './App.css'
import MarkdownViewer from "./components/MarkdownViewer";
import Summary from "./components/Summary";

function App() {
  // 创建状态来跟踪当前选中的句子
  // 初始值为null，表示没有选中任何句子
  const [selectedSentence, setSelectedSentence] = useState(null);
  
  // 当用户点击摘要中的句子时调用此函数
  // 这个函数将被传递给Summary组件，并在那里调用
  const handleSentenceClick = (sentence) => {
    setSelectedSentence(sentence); // 更新选中的句子状态
  };

  return (
    // 应用的主容器，样式在App.css中定义
    <div className="App">
      {/* 页面标题 */}
      <h1 className="text-2xl font-bold mb-4">📄 论文阅读助手</h1>
      
      {/* 双栏布局容器 
          - dual-pane-container类定义了flex布局，使子元素水平排列
          - 这个容器会占据视口高度减去100px的空间
      */}
      <div className="dual-pane-container">
        {/* 左侧栏 - 显示PDF原文内容 
            - pane类使每个面板占据相等的空间(flex: 1)
            - 并添加滚动条、边框和阴影
        */}
        <div className="pane">
          {/* 左侧栏标题 */}
          <h2 className="pane-title">原文内容</h2>
          {/* MarkdownViewer组件，显示PDF内容
              - 传入highlightText prop，告诉组件哪个句子需要高亮
          */}
          <MarkdownViewer highlightText={selectedSentence} />
        </div>
        
        {/* 右侧栏 - 显示AI生成的摘要 
            - 使用与左侧相同的pane类，确保两栏大小一致
        */}
        <div className="pane">
          {/* 右侧栏标题 */}
          <h2 className="pane-title">AI 摘要</h2>
          {/* Summary组件，显示AI生成的摘要
              - 传入onSentenceClick回调函数，使组件能够通知App组件哪个句子被点击
          */}
          <Summary onSentenceClick={handleSentenceClick} />
        </div>
      </div>
    </div>
  );
}

export default App
