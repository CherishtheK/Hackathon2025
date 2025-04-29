import PyPDF2
import re

def extract_pdf_info(pdf_path):
    try:
        with open(pdf_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            
            # 尝试从PDF元数据中获取标题
            if reader.metadata and reader.metadata.get('/Title'):
                return {'title': reader.metadata['/Title']}
            
            # 如果元数据中没有标题，尝试从第一页文本中提取
            first_page = reader.pages[0]
            text = first_page.extract_text()
            
            # 尝试找到第一个看起来像标题的文本行
            lines = text.split('\n')
            for line in lines:
                # 跳过太短的行
                if len(line.strip()) < 5:
                    continue
                # 跳过明显不是标题的行（如页码、日期等）
                if re.match(r'^[0-9]+$', line.strip()) or 'downloaded' in line.lower():
                    continue
                # 返回第一个合适的行作为标题
                return {'title': line.strip()}
            
            # 如果都没找到，返回文件名
            return {'title': pdf_path.split('/')[-1]}
            
    except Exception as e:
        print(f"Error extracting PDF info: {str(e)}")
        return {'title': pdf_path.split('/')[-1]} 