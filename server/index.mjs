import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3000;

// Add error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({ error: 'Server error', details: err.message });
});

// Use standard CORS middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS']
}));

// Ensure necessary directories exist
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

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Ensure filename is safe
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, safeName);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Only accept PDF files
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

// Ensure directories exist before starting server
await ensureDirectories().catch(console.error);

// Handle file upload
app.post('/upload', upload.single('file'), async (req, res) => {
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

    // Check upload directory
    const uploadDir = join(__dirname, 'uploads');
    console.log('📂 Upload directory:', uploadDir);
    console.log('Directory exists:', fs.existsSync(uploadDir));

    // Check if file exists
    if (!fs.existsSync(req.file.path)) {
      console.error('❌ Uploaded file not found:', req.file.path);
      return res.status(500).json({ error: 'Uploaded file not found' });
    }
    
    console.log('✅ File saved successfully to:', req.file.path);

    // Get Python script path
    const scriptPath = join(__dirname, 'python', 'extract_pdf_to_json_md.py');
    console.log('Python script path:', scriptPath);
    
    if (!fs.existsSync(scriptPath)) {
      console.error('❌ Python script not found');
      return res.status(500).json({ error: 'Python script not found' });
    }

    // Ensure JSON output directory exists
    const jsonDir = join(__dirname, '..', 'public', 'json');
    if (!fs.existsSync(jsonDir)) {
      console.log('Creating JSON output directory:', jsonDir);
      fs.mkdirSync(jsonDir, { recursive: true });
    }

    // Run Python script with timeout
    console.log('Executing Python script:', `python3 ${scriptPath} ${req.file.path}`);
    
    const pythonProcess = spawn('python3', [scriptPath, req.file.path]);
    let outputData = '';
    let errorData = '';

    // Set timeout for Python process (5 minutes)
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

      // Get generated JSON file path
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
        // Read and return JSON data
        console.log('Reading JSON file');
        const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        console.log('JSON data size:', JSON.stringify(jsonData).length, 'bytes');
        
        // Clean up uploaded PDF file
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

// 添加删除文件的路由
app.delete('/api/delete-file', async (req, res) => {
  try {
    const filename = req.query.filename;
    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }

    // 删除 JSON 文件
    const jsonPath = join(__dirname, '..', 'public', 'json', filename);
    if (fs.existsSync(jsonPath)) {
      fs.unlinkSync(jsonPath);
      console.log('Deleted JSON file:', jsonPath);
    }

    // 尝试删除原始 PDF 文件（如果存在）
    const pdfFilename = filename.replace('_structured.json', '.pdf');
    const pdfPath = join(__dirname, 'uploads', pdfFilename);
    if (fs.existsSync(pdfPath)) {
      fs.unlinkSync(pdfPath);
      console.log('Deleted PDF file:', pdfPath);
    }

    res.json({ message: 'Files deleted successfully' });
  } catch (error) {
    console.error('Error deleting files:', error);
    res.status(500).json({ error: 'Failed to delete files', details: error.message });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
});
