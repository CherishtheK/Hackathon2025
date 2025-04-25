import React, { useState, useEffect } from "react";
import { List, Grid, ChevronLeft } from "lucide-react";
import YourMarkdownViewer from "./MarkdownViewer";
import YourSummary from "./Summary";
import { throttledOpenAI, callWithRetry } from '../utils/apiUtils';
import Chat from "./Chat";
import { storeDocument, createProject, getAllProjects, getUnsortedDocuments, getProjectDocuments } from '../utils/dbUtils';
import UploadDialog from './UploadDialog';

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
  const [blocks, setBlocks] = useState([]);
  const [documentText, setDocumentText] = useState("");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [projects, setProjects] = useState([]);
  const [unsortedDocs, setUnsortedDocs] = useState([]);

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

  useEffect(() => {
    const fetchDocument = async () => {
      if (activeView === "detail") {
        try {
          const response = await fetch("/annurev-biodatasci-092820-114757_structured.json");
          const blocks = await response.json();
          setBlocks(blocks);
          setDocumentText(blocks.map(block => block.text).join("\n"));
        } catch (error) {
          console.error("获取文档失败:", error);
        }
      }
    };
    
    fetchDocument();
  }, [activeView]);

  const loadData = async () => {
    if (activeView === "library") {
      const projectList = await getAllProjects();
      console.log("加载的项目:", projectList);
      setProjects(projectList);
      
      const docList = await getUnsortedDocuments();
      console.log("加载的文档:", docList);
      setUnsortedDocs(docList);
    }
  };

  const handleUpload = async (data) => {
    try {
      if (data.type === 'project') {
        await createProject(data.name, data.description);
        console.log("项目创建成功:", data.name);
      } else if (data.type === 'document') {
        await storeDocument(data.file);
        console.log("文档上传成功:", data.file.name);
      }
      
      setShowUploadDialog(false);
      setShowFabMenu(false);
      
      // 添加短延迟确保数据库操作完成
      setTimeout(async () => {
        await loadData();
        console.log("数据重新加载完成");
      }, 300);
    } catch (error) {
      console.error("上传/创建失败:", error);
      alert("操作失败，请重试");
    }
  };

  useEffect(() => {
    loadData();
  }, [activeView]);

  return (
    <WindowShell title="Knowledge Bridge">
      {showUploadDialog && (
        <UploadDialog 
          onClose={() => setShowUploadDialog(false)} 
          onUpload={handleUpload}
          showProjectCreation={true}
        />
      )}
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
                  <h3 className="text-lg font-medium p-4 border-b flex-shrink-0">Chat with AI</h3>
                  <div className="flex-1 overflow-hidden" style={{height: "calc(100vh - 200px)"}}>
                    <Chat documentContent={documentText} />
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
                  {projects.map((proj) => (
                    <div
                      key={proj.id}
                      className={`border rounded ${viewMode === "grid" ? "p-4 shadow-sm hover:shadow-md" : "py-2 px-3 flex justify-between items-center"} cursor-pointer`}
                      onClick={() => setActiveView("detail")}
                    >
                      {viewMode === "grid" ? (
                        <>
                          <h3 className="text-md font-semibold truncate">{proj.name}</h3>
                          <p className="text-sm text-gray-600 mt-1 truncate">{proj.description || ""}</p>
                          <p className="text-xs text-gray-400 mt-2">{proj.documentCount || 0} PDFs</p>
                        </>
                      ) : (
                        <>
                          <span className="text-sm font-medium text-gray-800 truncate">{proj.name}</span>
                          <span className="text-xs text-gray-500">{proj.documentCount || 0} PDFs</span>
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
                  {unsortedDocs.map((doc) => (
                    <div
                      key={doc.id}
                      className="border rounded p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer"
                      onClick={() => setActiveView("detail")}
                    >
                      <h3 className="text-sm font-medium truncate">{doc.name}</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        上传于 {new Date(doc.uploadDate).toLocaleDateString()}
                      </p>
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
                      <button 
                        className="px-4 py-2 hover:bg-gray-100 text-left w-40"
                        onClick={() => {
                          setShowUploadDialog(true);
                          setShowFabMenu(false);
                        }}
                      >
                        上传文档/创建项目
                      </button>
                    </div>
                  )}
                </div>
              </section>
              <button 
                onClick={loadData}
                className="text-sm px-3 py-1 bg-blue-100 rounded"
              >
                刷新数据
              </button>
            </>
          )}
        </main>
      </div>
    </WindowShell>
  );
}
