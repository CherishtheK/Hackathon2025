import React, { useState, useEffect } from "react";
import { List, Grid, ChevronLeft } from "lucide-react";
import YourMarkdownViewer from "./MarkdownViewer";
import YourSummary from "./Summary";
import { throttledOpenAI, callWithRetry } from '../utils/apiUtils';
import Chat from "./Chat";
import { 
  storeDocument, 
  createProject, 
  getAllProjects, 
  getUnsortedDocuments, 
  getProjectDocuments,
  updateDocumentInDB 
} from '../utils/dbUtils';
import UploadDialog from './UploadDialog';

// WindowShell: Wrapper component for PWA-like window frame
function WindowShell({ children, title = "Knowledge Bridge" }) {
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

export default function PartnerView({ initialDocument, onUpdateDocument }) {
  const [viewMode, setViewMode] = useState("grid");
  const [activeView, setActiveView] = useState("library");
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [expandedProject, setExpandedProject] = useState(null);
  const [selectedSentence, setSelectedSentence] = useState("");
  const [citedBlockIndices, setCitedBlockIndices] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [documentText, setDocumentText] = useState("");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [projects, setProjects] = useState([]);
  const [unsortedDocs, setUnsortedDocs] = useState([]);
  const [currentDocument, setCurrentDocument] = useState(initialDocument);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [documentSummaries, setDocumentSummaries] = useState({});
  const [currentSummary, setCurrentSummary] = useState(null);

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

  const updateDocumentTitle = async (newTitle) => {
    if (!currentDocument?.id) return;
    
    try {
      await updateDocumentInDB(currentDocument.id, { title: newTitle });
      
      const updatedDoc = {
        ...currentDocument,
        title: newTitle,
      };
      setCurrentDocument(updatedDoc);
      
      setUnsortedDocs(prev => 
        prev.map(doc => 
          doc.id === currentDocument.id 
            ? { ...doc, title: newTitle }
            : doc
        )
      );
      
      onUpdateDocument(updatedDoc);
      
      setIsEditingTitle(false);
    } catch (error) {
      console.error('更新标题失败:', error);
    }
  };

  const titleEditingSection = (
    <div className="flex items-center">
      <input
        type="text"
        value={editedTitle}
        onChange={(e) => setEditedTitle(e.target.value)}
        className="text-2xl font-semibold px-2 py-1 border rounded"
        autoFocus
        onBlur={() => {
          if (editedTitle.trim()) {
            updateDocumentTitle(editedTitle.trim());
          }
        }}
        onKeyPress={(e) => {
          if (e.key === 'Enter' && editedTitle.trim()) {
            updateDocumentTitle(editedTitle.trim());
          }
        }}
      />
    </div>
  );

  // 添加新的函数来处理summary的事件绑定
  const bindSummaryEvents = (container) => {
    if (!container) return;
    
    const summaryElements = container.querySelectorAll('[data-sentence]');
    summaryElements.forEach(element => {
      // 移除现有的点击事件
      const clone = element.cloneNode(true);
      element.parentNode.replaceChild(clone, element);
      
      // 添加新的点击事件
      clone.addEventListener('click', (e) => {
        e.preventDefault();
        const sentence = clone.getAttribute('data-sentence');
        const citationsAttr = clone.getAttribute('data-citations');
        const citations = citationsAttr ? JSON.parse(citationsAttr) : [];
        
        // 更新视觉反馈
        summaryElements.forEach(el => el.classList.remove('selected-sentence'));
        clone.classList.add('selected-sentence');
        
        // 触发高亮
        handleYourSentenceClick(sentence, citations);
      });
    });
  };

  const handleYourSentenceClick = (sentence, citations = []) => {
    if (!currentDocument?.id) return;
    
    // 清除所有现有高亮
    const prevHighlights = document.querySelectorAll('.highlight-text');
    prevHighlights.forEach(el => {
      el.classList.remove('highlight-text');
      el.style.backgroundColor = '';
    });

    // 添加新的高亮
    if (citations && citations.length > 0) {
      citations.forEach(index => {
        const element = document.querySelector(`[data-block-index="${index}"]`);
        if (element) {
          element.classList.add('highlight-text');
          element.style.backgroundColor = '#FFEB3B';
          // 滚动到第一个高亮元素
          if (index === citations[0]) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      });
    }

    const summaryContainer = document.querySelector('.summary-container');
    
    // 保存状态
    const summaryData = {
      sentence,
      citations,
      content: summaryContainer?.innerHTML || '',
      selectedSentence: sentence
    };
    
    setDocumentSummaries(prev => ({
      ...prev,
      [currentDocument.id]: summaryData
    }));
    
    setSelectedSentence(sentence);
    setCitedBlockIndices(citations);
    setCurrentSummary(summaryData);
  };

  // 修改摘要初始化效果
  useEffect(() => {
    const initSummary = async () => {
      if (activeView === "detail" && currentDocument?.id) {
        const existingSummary = documentSummaries[currentDocument.id];
        if (existingSummary) {
          const summaryContainer = document.querySelector('.summary-container');
          if (summaryContainer) {
            // 恢复摘要内容
            summaryContainer.innerHTML = existingSummary.content;
            
            // 设置一个观察器来监视DOM变化
            const observer = new MutationObserver((mutations) => {
              // 当DOM变化时重新绑定事件
              bindSummaryEvents(summaryContainer);
              
              // 如果有选中的句子，恢复高亮
              if (existingSummary.selectedSentence) {
                const selectedElement = summaryContainer.querySelector(
                  `[data-sentence="${existingSummary.selectedSentence}"]`
                );
                if (selectedElement) {
                  selectedElement.classList.add('selected-sentence');
                }
              }
              
              // 恢复原文高亮
              if (existingSummary.citations) {
                existingSummary.citations.forEach(index => {
                  const element = document.querySelector(`[data-block-index="${index}"]`);
                  if (element) {
                    element.classList.add('highlight-text');
                    element.style.backgroundColor = '#FFEB3B';
                  }
                });
              }
            });
            
            // 开始观察
            observer.observe(summaryContainer, {
              childList: true,
              subtree: true,
              characterData: true
            });
            
            // 立即绑定一次事件
            bindSummaryEvents(summaryContainer);
            
            // 清理函数
            return () => observer.disconnect();
          }
        } else {
          console.log("初始化摘要");
          setTimeout(() => {
            const summaryButton = document.querySelector('.summary-container button:first-child');
            if (summaryButton) {
              summaryButton.click();
            }
          }, 1000);
        }
      }
    };
    
    initSummary();
  }, [activeView, currentDocument?.id]);

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
      console.log('开始处理上传:', data);
      if (data.type === 'project') {
        await createProject(data.name, data.description);
        console.log("项目创建成功:", data.name);
      } else if (data.type === 'document') {
        // 创建 File 对象
        const file = new File([data.file], data.name, {
          type: 'application/pdf'
        });
        console.log('准备存储文件:', file);
        
        const docId = await storeDocument(file);
        console.log("文档上传成功，ID:", docId);
        
        const newDoc = {
          id: docId,
          title: data.name,
          name: data.name,
          uploadDate: new Date().toISOString()
        };
        console.log('设置当前文档:', newDoc);
        
        setCurrentDocument(newDoc);
        setActiveView("detail");
      }
      
      setShowUploadDialog(false);
      setShowFabMenu(false);
      
      console.log('准备重新加载数据...');
      await loadData();
      console.log("数据重新加载完成");
    } catch (error) {
      console.error("上传/创建失败:", error);
      alert("操作失败：" + error.message);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeView]);

  const renderDocumentItem = (doc) => (
    <div
      key={doc.id}
      className="border rounded p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer"
      onClick={() => {
        setCurrentDocument(doc);
        setActiveView("detail");
      }}
    >
      <h3 className="text-sm font-medium truncate">{doc.title || doc.name}</h3>
      <p className="text-xs text-gray-500 mt-1">
        上传于 {new Date(doc.uploadDate).toLocaleDateString()}
      </p>
    </div>
  );

  // 添加样式
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .highlight-text {
        background-color: #FFEB3B !important;
        transition: background-color 0.3s ease;
      }
      .selected-sentence {
        background-color: #E3F2FD !important;
        border-radius: 4px;
        padding: 2px 4px;
        cursor: pointer;
      }
      .summary-container [data-sentence] {
        cursor: pointer;
        transition: background-color 0.2s ease;
      }
      .summary-container [data-sentence]:hover {
        background-color: #F5F5F5;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <WindowShell title={currentDocument?.title || currentDocument?.name || "Knowledge Bridge"}>
      {showUploadDialog && (
        <UploadDialog 
          onClose={() => setShowUploadDialog(false)} 
          onUpload={handleUpload}
          showProjectCreation={true}
        />
      )}
      <div className="flex h-full">
        <nav className="w-48 bg-gray-50 p-4 flex flex-col relative">
          <div className="flex-1 space-y-4">
            {/* Projects Section */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 mb-2">Projects</h3>
              <div className="space-y-1">
                {projects.map((proj) => (
                  <button
                    key={proj.id}
                    className="w-full text-left flex items-center gap-2 text-gray-700 hover:text-black"
                    onClick={() => setActiveView('detail')}
                  >
                    <span className="inline-block w-4 h-4">📁</span>
                    <span className="truncate w-full" title={proj.name}>
                      {proj.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Unsorted Documents Section */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 mb-2">Unsorted PDFs</h3>
              <div className="space-y-1">
                {unsortedDocs.map((doc) => (
                  <button
                    key={doc.id}
                    className="w-full text-left flex items-center gap-2 text-gray-700 hover:text-black"
                    onClick={() => {
                      setCurrentDocument(doc);
                      setActiveView('detail');
                    }}
                  >
                    <span className="inline-block w-4 h-4">📄</span>
                    <span className="truncate w-full" title={doc.title || doc.name}>
                      {doc.title || doc.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button
            className="absolute bottom-4 left-4 text-xs font-medium text-gray-600 hover:text-gray-800"
            onClick={() => setShowSettings(true)}
          >
            ⚙️ Settings
          </button>
        </nav>
        <main className="flex-1 p-6 flex flex-col overflow-hidden">
          {activeView === "detail" ? (
            <section className="flex-1 flex flex-col">
              <div className="flex items-center space-x-2 mb-4">
                <button onClick={() => setActiveView("library")}> 
                  <ChevronLeft size={20} className="text-gray-700 hover:text-black" />
                </button>
                {isEditingTitle ? titleEditingSection : (
                  <h2 
                    className="text-2xl font-semibold cursor-pointer hover:text-blue-600"
                    onClick={() => {
                      setEditedTitle(currentDocument?.title || currentDocument?.name || "");
                      setIsEditingTitle(true);
                    }}
                  >
                    {currentDocument?.title || currentDocument?.name}
                    <span className="text-sm text-gray-400 ml-2">✎</span>
                  </h2>
                )}
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
                  {unsortedDocs.map(renderDocumentItem)}
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
