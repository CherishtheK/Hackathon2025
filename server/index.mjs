import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// 使用标准的cors中间件
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

// 确保上传目录存在
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// 配置 multer 存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/') // 确保这个目录存在
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
});

const upload = multer({ storage: storage });

// 提取PDF信息的函数
function extractPdfInfo(filePath) {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python3', [
      path.join(__dirname, 'extract_pdf_info.py'),
      filePath
    ]);

    let result = '';

    pythonProcess.stdout.on('data', (data) => {
      result += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error(`Python Error: ${data}`);
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Python process exited with code ${code}`));
        return;
      }
      try {
        const info = JSON.parse(result);
        resolve(info);
      } catch (e) {
        reject(e);
      }
    });
  });
}

app.post('/upload', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }
    
    // 提取PDF信息
    const pdfInfo = await extractPdfInfo(req.file.path);
    
    console.log('Received file:', req.file.filename);
    res.json({ 
      message: 'File uploaded successfully',
      filename: req.file.filename,
      title: pdfInfo.title || req.file.originalname // 如果提取失败则使用原始文件名
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// 测试路由
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
  console.log('Test endpoint: http://localhost:3000/test');
});
