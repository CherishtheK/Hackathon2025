import React, { useState, useRef } from 'react';

function UploadDialog({ onClose, onUpload, showProjectCreation = false }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [createProject, setCreateProject] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = () => {
    if (createProject && showProjectCreation) {
      if (!projectName) {
        alert('请输入项目名称');
        return;
      }
      onUpload({
        type: 'project',
        name: projectName,
        description: projectDescription
      });
    } else if (selectedFile) {
      onUpload({
        type: 'document',
        file: selectedFile
      });
    } else {
      alert('请选择要上传的文件');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-[400px] space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">
            {showProjectCreation 
              ? (createProject ? '创建新项目' : '上传文档') 
              : '上传文档'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        {showProjectCreation && (
          <div className="flex items-center space-x-2 mb-4">
            <button
              onClick={() => setCreateProject(false)}
              className={`px-3 py-1 rounded text-sm ${!createProject ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              上传文档
            </button>
            <button
              onClick={() => setCreateProject(true)}
              className={`px-3 py-1 rounded text-sm ${createProject ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              创建项目
            </button>
          </div>
        )}

        {createProject && showProjectCreation ? (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">项目名称</label>
              <input 
                type="text" 
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="输入项目名称"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">描述（可选）</label>
              <textarea
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
                rows="3"
                placeholder="简要描述项目内容..."
              />
            </div>
          </>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">选择文件</label>
            <div className="flex items-center">
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current.click()}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded border text-sm"
              >
                选择PDF文件
              </button>
              <span className="ml-2 text-sm text-gray-600">
                {selectedFile ? selectedFile.name : '未选择文件'}
              </span>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-gray-600 mr-2"
          >
            取消
          </button>
          <button 
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            {createProject && showProjectCreation ? '创建项目' : '上传文档'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default UploadDialog;
