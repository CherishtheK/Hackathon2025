import os
import json
import fitz  # PyMuPDF
import sys
from datetime import datetime

def extract_text_from_pdf(pdf_path):
    """
    从PDF中提取文本
    """
    try:
        # 打开PDF文件
        doc = fitz.open(pdf_path)
        
        # 提取文本
        text_blocks = []
        for page_num in range(len(doc)):
            page = doc[page_num]
            blocks = page.get_text("blocks")
            for block in blocks:
                text_blocks.append({
                    "text": block[4],
                    "page": page_num + 1,
                    "bbox": [round(x, 2) for x in block[:4]]
                })
        
        doc.close()
        return text_blocks
        
    except Exception as e:
        print(f"Error processing PDF: {str(e)}", file=sys.stderr)
        raise

def process_pdf(pdf_path):
    """
    处理PDF文件并生成JSON输出
    """
    try:
        # 获取文件名
        filename = os.path.basename(pdf_path)
        
        # 提取文本
        text_blocks = extract_text_from_pdf(pdf_path)
        
        # 创建输出数据结构
        output = {
            "title": os.path.splitext(filename)[0],
            "processed_date": datetime.now().isoformat(),
            "content": text_blocks,
            "metadata": {
                "filename": filename,
                "file_size": os.path.getsize(pdf_path),
                "page_count": len(text_blocks),
                "created_at": datetime.now().isoformat()
            }
        }
        
        # 确保输出目录存在
        output_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'public', 'json')
        os.makedirs(output_dir, exist_ok=True)
        
        # 生成输出文件路径
        output_filename = os.path.splitext(filename)[0] + '_structured.json'
        output_path = os.path.join(output_dir, output_filename)
        
        # 写入JSON文件
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(output, f, ensure_ascii=False, indent=2)
            
        print(f"Successfully processed {filename}")
        print(f"Output saved to {output_path}")
        return True
        
    except Exception as e:
        print(f"Error processing PDF: {str(e)}", file=sys.stderr)
        return False

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python extract_pdf_to_json_md.py <pdf_file_path>", file=sys.stderr)
        sys.exit(1)
        
    pdf_path = sys.argv[1]
    if not os.path.exists(pdf_path):
        print(f"Error: File not found: {pdf_path}", file=sys.stderr)
        sys.exit(1)
        
    try:
        success = process_pdf(pdf_path)
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"Fatal error: {str(e)}", file=sys.stderr)
        sys.exit(1) 