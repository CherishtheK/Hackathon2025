import React, { useState, useRef } from 'react';

const BLOB_SAS_URL = "https://hackathoncc2025.blob.core.windows.net/uploadedpdfs?sp=racwdl&st=2025-04-30T07:51:28Z&se=2025-04-30T15:51:28Z&spr=https&sv=2024-11-04&sr=c&sig=MFO87LzsaAnRVwkXUO0aGVR4o1AW5tNAM461%2BTwX%2FxQ%3D";

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

  const handleSubmit = async () => {
    if (createProject && showProjectCreation) {
      // 创建项目模式
      if (!projectName.trim()) {
        alert('Please enter project name');
        return;
      }
      try {
        await onUpload({
          type: 'project',
          name: projectName,
          description: projectDescription
        });
        onClose();
      } catch (error) {
        alert('Failed to create project: ' + error.message);
      }
      return;
    }

    // 上传文档模式
    if (selectedFile) {
      try {
        // 拼接最终上传 URL（容器SAS URL + /文件名）
        const uploadUrl = BLOB_SAS_URL.split('?')[0] + '/' + encodeURIComponent(selectedFile.name) + '?' + BLOB_SAS_URL.split('?')[1];
        // 上传
        const response = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'x-ms-blob-type': 'BlockBlob'
          },
          body: selectedFile
        });
        if (!response.ok) {
          throw new Error(`Azure Blob upload failed: ${response.statusText}`);
        }
        alert('Upload success!');
        // 调用父组件的 onUpload 函数（只传元数据）
        await onUpload({
          type: 'document',
          name: selectedFile.name,
          file: null, // 不再传文件内容
          uploadDate: new Date().toISOString()
        });
        onClose();
      } catch (error) {
        console.error('Error during upload:', error);
        alert('Upload failed: ' + error.message);
      }
    } else {
      alert('Please select a file to upload');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-[400px] space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">
            {showProjectCreation 
              ? (createProject ? 'Create New Project' : 'Upload PDF') 
              : 'Upload PDF'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        {showProjectCreation && (
          <div className="flex items-center space-x-2 mb-4">
            <button
              onClick={() => setCreateProject(false)}
              className={`px-3 py-1 rounded text-sm ${!createProject ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Upload PDF
            </button>
            <button
              onClick={() => setCreateProject(true)}
              className={`px-3 py-1 rounded text-sm ${createProject ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Create Project
            </button>
          </div>
        )}

        {createProject && showProjectCreation ? (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
              <input 
                type="text" 
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="Enter project name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
              <textarea
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
                rows="3"
                placeholder="Briefly describe the project..."
              />
            </div>
          </>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select File</label>
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
                Choose PDF File
              </button>
              <span className="ml-2 text-sm text-gray-600">
                {selectedFile ? selectedFile.name : 'No file selected'}
              </span>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-gray-600 mr-2"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            {createProject && showProjectCreation ? 'Create Project' : 'Upload PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default UploadDialog;
