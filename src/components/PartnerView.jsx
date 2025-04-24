import React, { useState, useEffect } from "react";
import { List, Grid, ChevronLeft } from "lucide-react";
import YourMarkdownViewer from "./MarkdownViewer";
import YourSummary from "./Summary";
import { throttledOpenAI, callWithRetry } from '../utils/apiUtils';

// WindowShell: Wrapper component for PWA-like window frame
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

export default function SummaryViewerWireframe() {
  const [viewMode, setViewMode] = useState("grid");
  const [activeView, setActiveView] = useState("library");
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [expandedProject, setExpandedProject] = useState(null);
  const [selectedSentence, setSelectedSentence] = useState(null);
  const [citedBlockIndices, setCitedBlockIndices] = useState([]);

  const pdfPages = [
    { id: "ref-1", text: `--- Page 1 ---\nOriginal Investigation | Infectious Diseases\nSex Differences in Long COVID...` },
    { id: "ref-2", text: `Abstract\nIMPORTANCE\nA substantial number ...` },
    { id: "ref-3", text: `RESULTS\nAmong 12,276 participants ...` }
  ];

  const handleSummaryClick = (refId) => {
    const el = document.getElementById(refId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.classList.add("bg-yellow-200");
      setTimeout(() => el.classList.remove("bg-yellow-200"), 2000);
    }
  };

  const handleYourSentenceClick = (sentence, citations = []) => {
    console.log('点击的句子:', sentence);
    console.log('引用索引:', citations);
    setSelectedSentence(sentence);
    setCitedBlockIndices(citations);
  };

  // 当组件首次加载时自动生成摘要
  useEffect(() => {
    const initSummary = async () => {
      if (activeView === "detail") {
        console.log("初始化摘要");
        // 延长时间等待组件完全加载
        setTimeout(() => {
          // 更精确地选择生成摘要按钮
          const summaryButton = document.querySelector('.summary-container button:first-child');
          console.log("找到摘要按钮:", summaryButton);
          if (summaryButton) {
            summaryButton.click();
            console.log("已点击摘要按钮");
          } else {
            console.error("未找到摘要按钮");
          }
        }, 1000); // 增加到1秒
      }
    };
    
    initSummary();
  }, [activeView]);

  return (
    <WindowShell title="Knowledge Bridge">
      <div className="flex h-full w-full">
        {activeView === "library" && (
          <aside className="w-64 border-r p-4 overflow-auto relative">
            <nav className="space-y-2 text-sm">
              {[
                { title: "Quantum Mechanics 101", files: ["Entanglement and Measurement", "Double-Slit Revisited"] },
                { title: "Health & Biology Facts", files: ["Gut Microbiome Trends"] },
                { title: "Historical Research Archive", files: ["Maritime Trade Records"] }
              ].map((proj, idx) => (
                <div key={idx}>
                  <button
                    onClick={() => setExpandedProject(idx === expandedProject ? null : idx)}
                    className="group w-full text-left flex items-center gap-2 font-medium text-gray-700 hover:text-black"
                  >
                    <span className="inline-block w-4 h-4">
                      {expandedProject === idx ? "▼" : "▶"}
                    </span>
                    <span className="truncate w-full" title={proj.title}>{proj.title}</span>
                  </button>
                  {expandedProject === idx && (
                    <div className="ml-6 mt-1 space-y-1 text-gray-600 text-xs">
                      {proj.files.map((file, j) => (
                        <button key={j} className="w-full text-left flex items-center gap-2 hover:text-black">
                          <span className="inline-block w-4 h-4">📄</span>
                          <span className="truncate w-full" title={file}>{file}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {[
                "Sex Differences in Long COVID",
                "Document 2.pdf"
              ].map((file, i) => (
                <button
                  key={i}
                  className="w-full text-left flex items-center gap-2 text-gray-700 hover:text-black"
                  onClick={() => setActiveView(file === "Sex Differences in Long COVID" ? "detail" : "library")}
                >
                  <span className="inline-block w-4 h-4">📄</span>
                  <span className="truncate w-full" title={file}>{file}</span>
                </button>
              ))}
              <button
                className="absolute bottom-4 left-4 text-xs font-medium text-gray-600 hover:text-gray-800"
                onClick={() => setShowSettings(true)}
              >
                ⚙️ Settings
              </button>
            </nav>
            {showSettings && (
              <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-lg p-6 w-[400px] space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold">Settings</h2>
                    <button onClick={() => setShowSettings(false)} className="text-gray-500 hover:text-gray-700">✕</button>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Language</label>
                    <select className="w-full border rounded px-3 py-1 text-sm">
                      <option>English</option>
                      <option>中文</option>
                      <option>Español</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      This affects interface and generated summary language.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location to Save Documents</label>
                    <div className="flex items-center space-x-2">
                      <input className="flex-1 border rounded px-3 py-1 text-sm" placeholder="Select folder..." readOnly />
                      <button className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded">Browse</button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      This folder stores PDFs, summaries, and saved AI insights.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </aside>
        )}
        <main className="flex-1 p-6 flex flex-col overflow-hidden">
          {activeView === "detail" ? (
            <section className="flex-1 flex flex-col">
              <div className="flex items-center space-x-2 mb-4">
                <button onClick={() => setActiveView("library")}> 
                  <ChevronLeft size={20} className="text-gray-700 hover:text-black" />
                </button>
                <h2 className="text-2xl font-semibold">Sex Differences in Long COVID</h2>
              </div>
              <div className="flex flex-1 border border-gray-200 rounded overflow-hidden divide-x">
                <div className="w-1/3 h-full overflow-auto bg-gray-50 p-4 flex flex-col">
                  <h3 className="text-lg font-medium mb-2 flex-shrink-0">原始文档</h3>
                  <div 
                    className="flex-1 overflow-auto" 
                    style={{maxHeight: "calc(100vh - 200px)", border: "1px solid blue"}}
                  >
                    <YourMarkdownViewer 
                      highlightText={selectedSentence} 
                      citedBlockIndices={citedBlockIndices} 
                    />
                  </div>
                </div>
                <div className="w-1/3 h-full overflow-auto bg-white p-4 flex flex-col">
                  <h3 className="text-lg font-medium mb-2 flex-shrink-0">AI摘要</h3>
                  <div 
                    className="flex-1 overflow-auto" 
                    style={{maxHeight: "calc(100vh - 200px)", border: "1px solid green"}}
                  >
                    <YourSummary onSentenceClick={handleYourSentenceClick} />
                  </div>
                </div>
                <div className="w-1/3 flex flex-col h-full bg-gray-50">
                  <div className="flex-1 overflow-auto p-4">
                    <h3 className="text-lg font-medium mb-2">Chat with AI</h3>
                    <div className="space-y-2">
                      <div className="flex justify-end">
                        <div className="bg-blue-100 text-blue-900 px-4 py-2 rounded-lg max-w-xs">
                          Q: What does "RR 1.31" mean here?
                        </div>
                      </div>
                      <div className="flex justify-start">
                        <div className="bg-gray-200 text-gray-900 px-4 py-2 rounded-lg max-w-xs">
                          A: RR stands for Risk Ratio. An RR of 1.31 means women are 31% more likely than men to experience long COVID.
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 border-t space-y-2">
                    <label className="flex items-center text-xs text-gray-600 gap-1">
                      <input type="checkbox" className="rounded border-gray-300" />
                      Search within original content only
                    </label>
                    <input
                      type="text"
                      placeholder="Ask something..."
                      className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:ring"
                    />
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <>
              <header className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold">My Library</h1>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-1 rounded ${viewMode === "grid" ? "bg-gray-300" : "hover:bg-gray-200"}`}
                  >
                    <Grid size={18} />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-1 rounded ${viewMode === "list" ? "bg-gray-300" : "hover:bg-gray-200"}`}
                  >
                    <List size={18} />
                  </button>
                </div>
              </header>
              <section className="mb-8">
                <div className="flex items-center mb-3">
                  <h2 className="text-sm text-gray-500 font-medium mr-2">Projects</h2>
                  <div className="flex-1 h-px bg-gray-300"></div>
                </div>
                <div className={`${viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}`}>                    
                  {[
                    { title: "Quantum Mechanics 101", desc: "An introductory course to quantum theory.", count: 3 },
                    { title: "Health & Biology Facts", desc: "Key insights from modern biology.", count: 5 },
                    { title: "Historical Research Archive", desc: "Primary sources from 18th century.", count: 7 }
                  ].map((proj, idx) => (
                    <div
                      key={idx}
                      className={`border rounded ${viewMode === "grid" ? "p-4 shadow-sm hover:shadow-md" : "py-2 px-3 flex justify-between items-center"} cursor-pointer`}
                      onClick={() => setActiveView("detail")}
                    >
                      {viewMode === "grid" ? (
                        <>
                          <h3 className="text-md font-semibold truncate">{proj.title}</h3>
                          <p className="text-sm text-gray-600 mt-1 truncate">{proj.desc}</p>
                          <p className="text-xs text-gray-400 mt-2">{proj.count} PDFs</p>
                        </>
                      ) : (
                        <>
                          <span className="text-sm font-medium text-gray-800 truncate">{proj.title}</span>
                          <span className="text-xs text-gray-500">{proj.count} PDFs</span>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </section>
              <section>
                <div className="flex items-center mb-3">
                  <h2 className="text-sm text-gray-500 font-medium mr-2">Unsorted PDFs</h2>
                  <div className="flex-1 h-px bg-gray-300"></div>
                </div>
                <div className={`${viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}`}>                  
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="border rounded p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer"
                      onClick={() => i === 1 && setActiveView("detail")}
                    >
                      <h3 className="text-sm font-medium truncate">{i === 1 ? "Sex Differences in Long COVID" : `Document ${i}.pdf`}</h3>
                      <p className="text-xs text-gray-500 mt-1">Uploaded 2 days ago</p>
                    </div>
                  ))}
                </div>
                <div className="absolute bottom-6 right-6">
                  <button
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-14 h-14 text-3xl flex items-center justify-center shadow-lg"
                    onClick={() => setShowFabMenu(!showFabMenu)}
                  >
                    +
                  </button>
                  {showFabMenu && (
                    <div className="absolute bottom-16 right-0 flex flex-col space-y-2 bg-white border rounded shadow-md p-2 text-sm">
                      <button className="px-4 py-2 hover:bg-gray-100 text-left w-40">Create Project</button>
                      <button className="px-4 py-2 hover:bg-gray-100 text-left w-40">Upload Document</button>
                    </div>
                  )}
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </WindowShell>
  );
}
