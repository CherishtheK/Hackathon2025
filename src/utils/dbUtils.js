// src/utils/dbUtils.js

// 打开数据库连接
export const openDatabase = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("KnowledgeBridgeDB", 1);
    
    // 数据库初始化/升级
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // 创建文档存储
      if (!db.objectStoreNames.contains("documents")) {
        const docStore = db.createObjectStore("documents", { keyPath: "id" });
        docStore.createIndex("name", "name", { unique: false });
        docStore.createIndex("uploadDate", "uploadDate", { unique: false });
        docStore.createIndex("projectId", "projectId", { unique: false });
      }
      
      // 创建项目存储
      if (!db.objectStoreNames.contains("projects")) {
        const projectStore = db.createObjectStore("projects", { keyPath: "id" });
        projectStore.createIndex("name", "name", { unique: false });
        projectStore.createIndex("creationDate", "creationDate", { unique: false });
      }
      
      // 创建摘要存储
      if (!db.objectStoreNames.contains("summaries")) {
        db.createObjectStore("summaries", { keyPath: "documentId" });
      }
    };
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// 存储文档
export const storeDocument = async (file, projectId = null) => {
  try {
    const db = await openDatabase();
    const fileData = await file.arrayBuffer();
    
    const docId = `doc_${Date.now()}`;
    const document = {
      id: docId,
      name: file.name,
      type: file.type,
      size: file.size,
      uploadDate: new Date().toISOString(),
      projectId: projectId,
      data: fileData
    };
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction("documents", "readwrite");
      const store = tx.objectStore("documents");
      const request = store.add(document);
      
      request.onsuccess = () => resolve(docId);
      request.onerror = () => reject(request.error);
      
      tx.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error("存储文档时出错:", error);
    throw error;
  }
};

// 创建项目
export const createProject = async (name, description) => {
  try {
    const db = await openDatabase();
    
    const projectId = `proj_${Date.now()}`;
    const project = {
      id: projectId,
      name,
      description,
      creationDate: new Date().toISOString(),
      documentCount: 0
    };
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction("projects", "readwrite");
      const store = tx.objectStore("projects");
      const request = store.add(project);
      
      request.onsuccess = () => resolve(projectId);
      request.onerror = () => reject(request.error);
      
      tx.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error("创建项目时出错:", error);
    throw error;
  }
};

// 获取所有项目
export const getAllProjects = async () => {
  try {
    const db = await openDatabase();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction("projects", "readonly");
      const store = tx.objectStore("projects");
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      
      tx.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error("获取项目列表时出错:", error);
    return [];
  }
};

// 获取所有未分类文档 - 修改版
export const getUnsortedDocuments = async () => {
  try {
    const db = await openDatabase();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction("documents", "readonly");
      const store = tx.objectStore("documents");
      
      // 关键修改：使用getAll()获取所有文档，然后手动过滤，而不是使用索引查询
      const request = store.getAll();
      
      request.onsuccess = () => {
        console.log("所有文档:", request.result);
        // 过滤掉大文件数据，只返回元数据，并手动筛选未分类文档
        const docs = request.result
          .filter(doc => !doc.projectId) // 筛选projectId为空、null或undefined的文档
          .map(doc => {
            const { data, ...metadata } = doc;
            return metadata;
          });
        
        console.log("过滤后的未分类文档:", docs);
        resolve(docs);
      };
      
      request.onerror = (event) => {
        console.error("获取文档时出错:", event.target.error);
        reject(request.error);
      };
      
      tx.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error("获取未分类文档时出错:", error);
    return [];
  }
};

// 获取项目中的文档
export const getProjectDocuments = async (projectId) => {
  try {
    const db = await openDatabase();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction("documents", "readonly");
      const store = tx.objectStore("documents");
      const index = store.index("projectId");
      const request = index.getAll(projectId);
      
      request.onsuccess = () => {
        // 过滤掉大文件数据，只返回元数据
        const docs = request.result.map(doc => {
          const { data, ...metadata } = doc;
          return metadata;
        });
        resolve(docs);
      };
      request.onerror = () => reject(request.error);
      
      tx.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error(`获取项目${projectId}文档时出错:`, error);
    return [];
  }
};

// 获取文档内容
export const getDocumentContent = async (docId) => {
  try {
    const db = await openDatabase();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction("documents", "readonly");
      const store = tx.objectStore("documents");
      const request = store.get(docId);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      
      tx.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error(`获取文档${docId}内容时出错:`, error);
    throw error;
  }
};
