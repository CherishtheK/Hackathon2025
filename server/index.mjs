import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3000;

// 配置 CORS
const corsOptions = {
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: true
};

// 使用 CORS 中间件
app.use(cors(corsOptions));

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({ error: 'Server error', details: err.message });
});

// 确保必要的目录存在
const ensureDirectories = async () => {
  const dirs = [
    path.join(__dirname, 'uploads'),
    path.join(__dirname, 'python'),
    path.join(__dirname, '..', 'public', 'json')
  ];
  
  for (const dir of dirs) {
    try {
      await fs.promises.access(dir);
      console.log(`Directory exists: ${dir}`);
    } catch {
      await fs.promises.mkdir(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  }
};

// 配置 multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, safeName);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// 删除文件的处理函数
app.delete('/api/delete-file', cors(corsOptions), async (req, res) => {
  console.log('\n=== DELETE Request Received ===');
  console.log('Request URL:', req.url);
  console.log('Query parameters:', req.query);
  console.log('Headers:', req.headers);

  try {
    const { pdfPath, jsonPath } = req.query;
    const warnings = [];

    if (!pdfPath && !jsonPath) {
      console.log('No file paths provided');
      return res.status(400).json({
        success: false,
        message: 'No file paths provided',
        warnings: []
      });
    }

    console.log('Processing delete request for:', {
      pdfPath: pdfPath || 'not provided',
      jsonPath: jsonPath || 'not provided'
    });

    if (pdfPath) {
      const fullPdfPath = path.join(__dirname, 'uploads', path.basename(pdfPath));
      console.log('Attempting to delete PDF:', fullPdfPath);
      
      try {
        if (fs.existsSync(fullPdfPath)) {
          await fs.promises.unlink(fullPdfPath);
          console.log('✅ PDF file deleted successfully');
        } else {
          console.log('⚠️ PDF file not found');
          warnings.push(`PDF file not found: ${path.basename(pdfPath)}`);
        }
      } catch (error) {
        console.error('❌ Error deleting PDF:', error);
        warnings.push(`Failed to delete PDF: ${error.message}`);
      }
    }

    if (jsonPath) {
      const fullJsonPath = path.join(__dirname, '..', 'public', 'json', path.basename(jsonPath));
      console.log('Attempting to delete JSON:', fullJsonPath);
      
      try {
        if (fs.existsSync(fullJsonPath)) {
          await fs.promises.unlink(fullJsonPath);
          console.log('✅ JSON file deleted successfully');
        } else {
          console.log('⚠️ JSON file not found');
          warnings.push(`JSON file not found: ${path.basename(jsonPath)}`);
        }
      } catch (error) {
        console.error('❌ Error deleting JSON:', error);
        warnings.push(`Failed to delete JSON: ${error.message}`);
      }
    }

    const response = {
      success: true,
      message: warnings.length > 0 ? 'Files deleted with warnings' : 'Files deleted successfully',
      warnings: warnings
    };

    console.log('Sending response:', JSON.stringify(response, null, 2));
    
    // 确保设置正确的响应头
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(response);

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    
    // 确保设置正确的响应头
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({
      success: false,
      message: 'Server error during file deletion',
      error: error.message,
      warnings: []
    });
  }
});

// 确保目录存在后启动服务器
await ensureDirectories().catch(console.error);

// 处理文件上传
app.post('/upload', cors(corsOptions), upload.single('file'), async (req, res) => {
  try {
    console.log('\n=== Processing new upload request ===');
    console.log('Request time:', new Date().toISOString());
    
    if (!req.file) {
      console.log('❌ No file received');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('📁 File received:', {
      originalname: req.file.originalname,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    });

    // 检查上传目录
    const uploadDir = join(__dirname, 'uploads');
    console.log('📂 Upload directory:', uploadDir);
    console.log('Directory exists:', fs.existsSync(uploadDir));

    // 检查文件是否存在
    if (!fs.existsSync(req.file.path)) {
      console.error('❌ Uploaded file not found:', req.file.path);
      return res.status(500).json({ error: 'Uploaded file not found' });
    }
    
    console.log('✅ File saved successfully to:', req.file.path);

    // 获取 Python 脚本路径
    const scriptPath = join(__dirname, 'python', 'extract_pdf_to_json_md.py');
    console.log('Python script path:', scriptPath);
    
    if (!fs.existsSync(scriptPath)) {
      console.error('❌ Python script not found');
      return res.status(500).json({ error: 'Python script not found' });
    }

    // 确保 JSON 输出目录存在
    const jsonDir = join(__dirname, '..', 'public', 'json');
    if (!fs.existsSync(jsonDir)) {
      console.log('Creating JSON output directory:', jsonDir);
      fs.mkdirSync(jsonDir, { recursive: true });
    }

    // 运行 Python 脚本并设置超时
    console.log('Executing Python script:', `python3 ${scriptPath} ${req.file.path}`);
    
    const pythonProcess = spawn('python3', [scriptPath, req.file.path]);
    let outputData = '';
    let errorData = '';

    // 设置 Python 进程超时（5分钟）
    const timeout = setTimeout(() => {
      console.error('Python process timed out');
      pythonProcess.kill();
    }, 5 * 60 * 1000);

    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('Python output:', output);
      outputData += output;
    });

    pythonProcess.stderr.on('data', (data) => {
      const error = data.toString();
      console.error('Python error:', error);
      errorData += error;
    });

    pythonProcess.on('error', (error) => {
      clearTimeout(timeout);
      console.error('Failed to start Python process:', error);
      return res.status(500).json({ 
        error: 'Failed to start Python process',
        details: error.message
      });
    });

    pythonProcess.on('close', (code) => {
      clearTimeout(timeout);
      console.log('Python process exit code:', code);
      
      if (code !== 0) {
        console.error('Python processing failed:', errorData);
        return res.status(500).json({ 
          error: 'Error processing PDF',
          details: errorData || 'Unknown error'
        });
      }

      // 获取生成的 JSON 文件路径
      const jsonFilename = req.file.filename.replace(/\.[^/.]+$/, '') + '_structured.json';
      const jsonPath = join(__dirname, '..', 'public', 'json', jsonFilename);
      
      console.log('Looking for JSON file:', jsonPath);
      console.log('JSON file exists:', fs.existsSync(jsonPath));
      
      if (!fs.existsSync(jsonPath)) {
        console.error('Generated JSON file not found');
        return res.status(500).json({ 
          error: 'JSON file not generated',
          details: outputData || 'No output from Python script'
        });
      }

      try {
        // 读取并返回 JSON 数据
        console.log('Reading JSON file');
        const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        console.log('JSON data size:', JSON.stringify(jsonData).length, 'bytes');
        
        // 清理上传的 PDF 文件
        fs.unlinkSync(req.file.path);
        console.log('Cleaned up uploaded PDF:', req.file.path);

        console.log('Processing complete, returning data');
        res.json({
          message: 'File processed successfully',
          data: jsonData
        });
      } catch (error) {
        console.error('Error processing JSON file:', error);
        return res.status(500).json({ 
          error: 'Error processing JSON file',
          details: error.message
        });
      }
    });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ 
      error: 'Server error',
      details: error.message
    });
  }
});

// 启动服务器
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

// 全局错误处理
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
});
