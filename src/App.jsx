// import { useState, useEffect } from 'react'
// import './App.css'
// import MarkdownViewer from "./components/MarkdownViewer";
// import Summary from "./components/Summary";
// import { List, Grid, ChevronLeft } from "lucide-react";
// import axios from 'axios';

// // 从搭档代码中复制WindowShell组件
// function WindowShell({ children, title }) {
//   return (
//     <div className="bg-gray-200 h-screen w-screen flex items-center justify-center">
//       <div className="w-[1280px] h-[800px] bg-white rounded-xl shadow-lg overflow-hidden border border-gray-300 flex flex-col">
//         <header className="h-10 bg-gray-100 border-b border-gray-300 flex items-center justify-between px-4">
//           <div className="flex items-center space-x-2">
//             <span className="w-3 h-3 bg-red-500 rounded-full inline-block" />
//             <span className="w-3 h-3 bg-yellow-400 rounded-full inline-block" />
//             <span className="w-3 h-3 bg-green-500 rounded-full inline-block" />
//           </div>
//           <div className="text-sm font-medium text-gray-700">{title}</div>
//           <div className="w-12" />
//         </header>
//         <main className="flex-1 overflow-hidden relative">{children}</main>
//       </div>
//     </div>
//   );
// }

// function App() {
//   // 创建状态来跟踪当前选中的句子
//   // 初始值为null，表示没有选中任何句子
//   const [selectedSentence, setSelectedSentence] = useState(null);
//   const [citedBlockIndices, setCitedBlockIndices] = useState([]);
//   // 添加视图管理状态
//   const [activeView, setActiveView] = useState("detail");
  
//   // 当用户点击摘要中的句子时调用此函数
//   // 这个函数将被传递给Summary组件，并在那里调用
//   const handleSentenceClick = (sentence, citations = []) => {
//     console.log('App收到的句子:', sentence);
//     console.log('App收到的引用索引:', citations);
//     setSelectedSentence(sentence);
//     setCitedBlockIndices(citations);
//   };

//   useEffect(() => {
//     // 简单测试API连接
//     async function testConnection() {
//       try {
//         const response = await axios.post(
//           '/openai/deployments/gpt-4/chat/completions?api-version=2025-01-01-preview',
//           {
//             messages: [
//               { role: "user", content: "返回数字1到5" }
//             ],
//             max_tokens: 10
//           }
//         );
//         console.log("API连接成功:", response.data);
//       } catch (error) {
//         console.error("API连接失败:", error);
//       }
//     }
    
//     testConnection();
//   }, []);

//   return (
//     <WindowShell title="论文阅读助手">
//       <div className="flex h-full w-full">
//         {activeView === "detail" ? (
//           <section className="flex-1 flex flex-col">
//             <div className="flex items-center space-x-2 mb-4 p-4">
//               <button onClick={() => setActiveView("library")}> 
//                 <ChevronLeft size={20} className="text-gray-700 hover:text-black" />
//               </button>
//               <h2 className="text-2xl font-semibold">论文阅读助手</h2>
//             </div>
//             <div className="flex flex-1 border border-gray-200 rounded overflow-hidden divide-x mx-4 mb-4">
//               {/* 左栏：原文内容 */}
//               <div className="w-1/3 h-full overflow-auto bg-gray-50 p-4">
//                 <h3 className="text-lg font-medium mb-2">原文内容</h3>
//                 <MarkdownViewer 
//                   highlightText={selectedSentence} 
//                   citedBlockIndices={citedBlockIndices} 
//                 />
//               </div>
              
//               {/* 中栏：AI摘要 */}
//               <div className="w-1/3 h-full overflow-auto bg-white p-4">
//                 <h3 className="text-lg font-medium mb-2">AI摘要</h3>
//                 <Summary onSentenceClick={handleSentenceClick} />
//               </div>
              
//               {/* 右栏：聊天功能（搭档的新功能） */}
//               <div className="w-1/3 flex flex-col h-full bg-gray-50">
//                 <div className="flex-1 overflow-auto p-4">
//                   <h3 className="text-lg font-medium mb-2">AI对话</h3>
//                   <div className="space-y-2">
//                     {/* 聊天内容可以后续添加 */}
//                   </div>
//                 </div>
//                 <div className="p-4 border-t space-y-2">
//                   <input
//                     type="text"
//                     placeholder="提问..."
//                     className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring"
//                   />
//                 </div>
//               </div>
//             </div>
//           </section>
//         ) : (
//           // 可以稍后实现库视图
//           <div className="p-4">
//             <h2 className="text-xl font-bold">文档库视图（开发中）</h2>
//             <button 
//               className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
//               onClick={() => setActiveView("detail")}
//             >
//               返回阅读视图
//             </button>
//           </div>
//         )}
//       </div>
//     </WindowShell>
//   );
// }

// export default App
// src/App.jsx
import React, { useState } from 'react';
import PartnerView from './components/PartnerView';

function App() {
  // 创建一个状态来存储当前文档信息
  const [currentDocument, setCurrentDocument] = useState({
    title: "My Document",  // 默认标题
    filename: null,     // 文件名
    file: null         // 文件对象
  });

  // 添加更新文档信息的方法
  const updateDocument = (updates) => {
    setCurrentDocument(prev => ({
      ...prev,
      ...updates
    }));
  };

  return (
    <PartnerView 
      initialDocument={currentDocument}
      onUpdateDocument={updateDocument}
    />
  );
}

export default App;