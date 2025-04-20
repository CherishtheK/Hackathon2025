import fitz  # PyMuPDF，用于处理 PDF 文件
import os
import json
import re

def is_valid_text(text):
    """
    判断文本是否有效：
    - 非空
    - 不是很短
    - 不包含无用信息，比如页码、版权、DOI 等
    """
    t = text.strip()
    if not t:
        return False
    if len(t) < 5:
        return False
    if t.lower().startswith(("page ", "doi", "copyright", "license")):
        return False
    return True


def is_author_name(text, page_num):
    """
    判断文本是否为作者名列表
    - 通常出现在论文的第一页
    - 包含多个人名，可能带有上标数字（机构标记）
    - 通常人名格式为 "名 姓" 或者 "姓 名"
    """
    if page_num > 2:  # 作者名通常只在前几页出现
        return False
    
    text = text.strip()
    
    # 检查是否有常见的作者名特征
    if "," in text and len(text.split()) >= 2 and len(text.split()) <= 10:
        # 检查是否符合"名 姓"或"姓 名"的模式
        name_parts = text.split(",")
        for part in name_parts:
            if re.search(r'[A-Z][a-z]+(\s+[A-Z]\.?)+\s+[A-Z][a-z]+', part):
                return True
    
    # 检查是否是带有上标数字的作者名格式（如 "Irene Y. Chen,1 Emma Pierson,2"）
    if re.search(r'[A-Z][a-z]+\s+[A-Z]\.?\s+[A-Z][a-z]+,\d', text):
        return True
    
    # 检查是否包含 "and" 连接的人名
    if " and " in text.lower() and len(text) < 100:
        return True
    
    # 检查是否匹配机构格式（更严格的规则）
    if text.strip().startswith(tuple(str(i) for i in range(1, 10)) + ("Department", "Institute", "Center", "Vector", "School")):
        if any(x in text for x in ["University", "Institute", "Department", "Center", "College", "School"]):
            return True
    
    # 检查是否包含电子邮件格式
    if "@" in text and "." in text and len(text) < 100:
        return True
    
    return False


def is_specific_section(text, section_name):
    """
    判断文本是否为特定的章节标题，如Abstract、Keywords等
    """
    text_lower = text.strip().lower()
    
    # 精确匹配章节名称
    if text_lower == section_name.lower():
        return True
    
    # 处理可能的带冒号的情况，如"Keywords:"
    if text_lower.startswith(f"{section_name.lower()}:") and len(text_lower) < len(section_name) + 5:
        return True
    
    # 处理可能的带数字序号的情况，如"1. Introduction"
    if section_name.lower() in text_lower and re.match(r'^\d+\.\s*', text_lower):
        return True
    
    # 处理全大写格式的章节标题
    if text.strip().upper() == section_name.upper():
        return True
    
    return False


def is_colored_introduction(text, page_num):
    """
    判断是否为彩色的Introduction部分（如截图中所示）
    """
    if page_num > 3:  # Introduction通常在前几页
        return False
    
    text = text.strip()
    
    # 匹配"1. INTRODUCTION"或类似格式（全大写）
    if re.match(r'^\d+\.\s*INTRODUCTION\s*$', text, re.IGNORECASE):
        return True
    
    # 匹配"1. Introduction"（首字母大写）
    if re.match(r'^\d+\.\s*Introduction\s*$', text, re.IGNORECASE):
        return True
    
    # 仅检测"INTRODUCTION"或"Introduction"单词
    if text.upper() == "INTRODUCTION" or text == "Introduction":
        return True
    
    return False


def is_numbered_section_title(text):
    """
    检查是否是带数字编号的章节标题，如：
    - 6.3. Model and Data Documentation
    - 2.1 Methods
    - 3.4.1 Subsection Title
    """
    text = text.strip()
    
    # 匹配双层或三层编号格式：X.Y. Title 或 X.Y.Z. Title
    if re.match(r'^\d+\.\d+(\.\d+)?\.?\s+[A-Z][a-zA-Z\s]+', text):
        return True
    
    # 匹配单层编号但包含特定关键词的标题
    if re.match(r'^\d+\.\s+[A-Z]', text):
        text_lower = text.lower()
        keywords = ["model", "data", "method", "result", "discussion", 
                   "conclusion", "introduction", "background", "analysis", 
                   "implementation", "evaluation", "experiment"]
        for keyword in keywords:
            if keyword in text_lower:
                return True
    
    return False


def try_merge_text_blocks(blocks_list, threshold=20):
    """
    尝试合并相邻的文本块，如果它们在视觉上看起来属于同一段落
    
    参数:
    - blocks_list: 文本块列表，每个块包含位置和文本内容
    - threshold: 认为两个块属于同一段落的垂直距离阈值
    
    返回:
    - 合并后的文本块列表
    """
    if not blocks_list or len(blocks_list) <= 1:
        return blocks_list
    
    # 按垂直位置（y0）排序
    sorted_blocks = sorted(blocks_list, key=lambda b: b[1])
    
    merged_blocks = []
    current_block = list(sorted_blocks[0])  # 转为列表以便修改
    
    for i in range(1, len(sorted_blocks)):
        block = sorted_blocks[i]
        prev_y1 = current_block[3]  # 当前块的底部y坐标
        current_y0 = block[1]  # 下一个块的顶部y坐标
        
        # 如果两个块足够接近，且宽度相似，认为它们是同一段落
        width_ratio = min(current_block[2] - current_block[0], block[2] - block[0]) / max(current_block[2] - current_block[0], block[2] - block[0])
        
        if current_y0 - prev_y1 < threshold and width_ratio > 0.7:
            # 合并文本，加入空格连接
            current_block[4] = current_block[4].rstrip() + " " + block[4].lstrip()
            # 更新边界框
            current_block[3] = block[3]  # 更新底部y坐标
        else:
            # 不合并，添加当前块并开始新的合并
            merged_blocks.append(tuple(current_block))
            current_block = list(block)
    
    # 添加最后一个处理的块
    merged_blocks.append(tuple(current_block))
    
    return merged_blocks


def guess_markdown_tag(text, page_num, block_index, total_blocks_on_page, blocks_list=None, block_pos=None):
    """
    根据文本内容、位置等特征判断是什么结构，返回相应的 Markdown 标记
    - 标题 -> 返回 '# '（一级标题）
    - 副标题 -> 返回 '## '
    - 普通段落 -> 返回 ''
    
    参数:
    - text: 文本内容
    - page_num: 当前页码
    - block_index: 当前文本块在页面上的索引位置
    - total_blocks_on_page: 当前页面上的文本块总数
    - blocks_list: 当前页面上的所有文本块列表（可选）
    - block_pos: 当前块的位置信息 [x0, y0, x1, y1]（可选）
    """
    stripped = text.strip()
    
    # 过滤掉作者名和机构信息
    if is_author_name(stripped, page_num):
        return ""
    
    # 检查是否是彩色的Introduction部分
    if is_colored_introduction(stripped, page_num):
        return "## "
    
    # 特定章节标题检测
    if is_specific_section(stripped, "Abstract"):
        return "## "
    
    if is_specific_section(stripped, "Keywords") or stripped.lower() == "keywords":
        return "## "
    
    # 检查是否是带数字编号的章节标题（例如"6.3. Model and Data Documentation"）
    if is_numbered_section_title(stripped):
        return "## "
    
    # 检查"Annu. Rev."等期刊信息，这些不应该被识别为标题
    if any(x in stripped for x in ["Annu. Rev.", "Annual Review"]) and re.search(r'\d{1,4}:\d{1,4}', stripped):
        return ""
    
    # 检查是否包含年份、卷号等信息，这些通常不是标题
    if re.search(r'(19|20)\d{2}', stripped) and len(stripped) < 50 and any(x in stripped.lower() for x in ["vol", "volume", "issue", "pp", "pages", "©", "copyright"]):
        return ""
    
    # 检查是否是论文标题
    # 论文标题通常是第一页前几行，字体较大，长度适中
    if page_num == 1 and block_index < total_blocks_on_page // 4:
        # 主标题通常是第一页最醒目的内容
        if len(stripped) > 20 and len(stripped) < 200 and stripped.count('\n') <= 1:
            # 排除可能是下载信息、日期等的文本
            if not any(x in stripped.lower() for x in ["downloaded", "guest", "ip:", "doi", "http", "www"]):
                # 排除带有电子邮件的行
                if not "@" in stripped and not re.search(r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}', stripped):
                    # 排除非常短的短语，或者是一些通用短语
                    if len(stripped.split()) > 2:
                        # 检查是否包含"Review"、"Science"等关键词，这些通常是标题的一部分
                        if any(x in stripped for x in ["Review", "Science", "Ethics", "Learning", "Healthcare", "Medical", "Data"]):
                            return "# "
    
    # 识别"1. Introduction"等章节标题（增强版）
    if re.match(r'^\d+\.\s*[A-Z][a-zA-Z\s]*$', stripped) and len(stripped) < 100:
        return "## "
    
    # 特殊匹配红色标题中的"1. INTRODUCTION"格式
    if re.match(r'^\d+\.?\s*INTRODUCTION$', stripped, re.IGNORECASE):
        return "## "
    
    # 论文章节标题 - 通常是短小的全大写或首字母大写的短语
    if len(stripped) < 80 and len(stripped) > 5:
        # 识别常见的章节名称，这些通常是二级标题
        common_sections = ["introduction", "background", "methods", "methodology", "results", 
                          "discussion", "conclusion", "references", "implementation", 
                          "related work", "future work", "acknowledgements", "abstract",
                          "model", "data", "documentation", "ethical considerations"]
        
        # 检查是否匹配常见章节名称（不考虑大小写）
        for section in common_sections:
            if stripped.lower() == section or stripped.lower() == section + "s":
                return "## "
            # 检查是否包含多个关键词组合，如"Model and Data Documentation"
            if section in stripped.lower() and len(stripped.split()) <= 6:
                keyword_count = 0
                for keyword in common_sections:
                    if keyword in stripped.lower():
                        keyword_count += 1
                if keyword_count >= 2:  # 包含至少两个关键词
                    return "## "
        
        # 全大写可能是主要章节标题
        if stripped.isupper() and len(stripped.split()) >= 1 and len(stripped.split()) <= 5:
            # 过滤掉缩写词和论文编号
            if not any(x in stripped for x in ["DOI", "ISBN", "ISSN", "URL", "HTTP"]):
                return "## "
        
        # 首字母大写的短词组，且不是作者相关的文本
        if stripped.istitle() and not any(x in stripped.lower() for x in ["university", "department", "institute", "email"]):
            # 排除可能出现的单词名词短语
            if len(stripped.split()) > 1 or stripped.lower() in common_sections:
                return "## "
        
        # 对于类似Model and Data Documentation这样的标题进行额外检查
        if "and" in stripped and len(stripped.split()) <= 6:
            for word in stripped.split():
                word = word.lower()
                if word in common_sections and len(word) > 3:  # 避免像"and"这样的短词
                    return "## "
    
    # 如果看起来像Abstract中的小标题，可能是三级标题
    if len(stripped) < 40 and re.match(r'^[A-Z][a-z]+(\s+[A-Z][a-z]+)*\s*:', stripped):
        return "### "

    return ""  # 普通段落，无特殊标记


def analyze_document_structure(doc):
    """
    预先分析文档结构，找出标题模式、字体大小分布等信息
    这有助于更准确地识别标题
    
    参数:
    - doc: 打开的PDF文档
    
    返回:
    - 文档结构分析结果，包括字体大小分布、可能的标题模式等
    """
    structure_info = {
        'font_sizes': {},  # 字体大小分布
        'header_patterns': [],  # 发现的标题模式
    }
    
    # 分析前3页，找出字体大小分布和标题模式
    for page_num in range(min(3, len(doc))):
        page = doc[page_num]
        
        # 尝试以不同格式获取文本，分析字体和排版
        try:
            # HTML格式包含字体信息
            html_text = page.get_text("html")
            # 提取字体大小信息
            font_sizes = re.findall(r'font-size:(\d+)px[^>]*>([^<]+)<', html_text)
            
            for size, text in font_sizes:
                size = int(size)
                text = text.strip()
                if len(text) >= 5:  # 忽略太短的文本
                    if size not in structure_info['font_sizes']:
                        structure_info['font_sizes'][size] = []
                    structure_info['font_sizes'][size].append(text)
            
            # 寻找可能的章节标题模式
            blocks = page.get_text("blocks")
            for block in blocks:
                text = block[4].strip()
                # 查找数字开头的可能标题
                if re.match(r'^\d+\.', text) or re.match(r'^\d+\.\d+\.', text):
                    if len(text) < 100 and text not in structure_info['header_patterns']:
                        structure_info['header_patterns'].append(text)
        except:
            continue
    
    # 按字体大小排序，找出最常用的几种字体大小
    if structure_info['font_sizes']:
        sorted_sizes = sorted(structure_info['font_sizes'].keys(), reverse=True)
        structure_info['main_sizes'] = sorted_sizes[:min(3, len(sorted_sizes))]
    else:
        structure_info['main_sizes'] = []
    
    return structure_info


def extract_blocks_from_pdf(pdf_path):
    """
    从 PDF 中提取每页的文字块及其位置、所属页码、结构类型等
    """
    doc = fitz.open(pdf_path)
    blocks_data = []
    
    # 首先分析文档结构
    structure_info = analyze_document_structure(doc)
    
    # 获取所有页面的块信息，以便后期分析
    all_pages_blocks = []
    for page_num, page in enumerate(doc):
        blocks = page.get_text("blocks")
        valid_blocks = [b for b in blocks if is_valid_text(b[4])]
        
        # 尝试合并相邻的文本块，使段落更连贯
        merged_blocks = try_merge_text_blocks(valid_blocks)
        all_pages_blocks.append(merged_blocks)
    
    # 查找论文标题位置 - 通常是第一页的前几行最大字体的文本
    title_candidates = []
    main_title = None
    
    if all_pages_blocks and len(all_pages_blocks[0]) > 0:
        first_page_blocks = all_pages_blocks[0]
        
        # 尝试从第一页的字体信息中找出主标题
        try:
            # 获取第一页的HTML格式文本（包含字体信息）
            first_page = doc[0]
            html_text = first_page.get_text("html")
            
            # 从HTML中提取最大字体的文本块
            font_sizes = re.findall(r'font-size:(\d+)px[^>]*>([^<]+)<', html_text)
            if font_sizes:
                # 按字体大小排序
                sorted_fonts = sorted(font_sizes, key=lambda x: int(x[0]), reverse=True)
                
                # 取最大字体的文本作为候选标题
                for font_size, text in sorted_fonts[:3]:  # 考虑前3个最大字体
                    if len(text.strip()) > 15 and not is_author_name(text.strip(), 1):
                        if not any(x in text.lower() for x in ["downloaded", "guest", "ip:", "doi"]):
                            main_title = text.strip()
                            break
        except:
            # 如果提取字体信息失败，回退到基于位置的方法
            pass
        
        # 如果通过字体信息未找到标题，尝试基于位置和内容找出标题
        if not main_title:
            for i, block in enumerate(first_page_blocks[:min(8, len(first_page_blocks))]):
                text = block[4].strip()
                if len(text) > 20 and len(text) < 200 and not is_author_name(text, 1):
                    # 排除下载信息和DOI等
                    if not any(x in text.lower() for x in ["downloaded", "guest", "ip:", "doi", "http", "www"]):
                        title_candidates.append((text, i))
            
            # 如果找到候选标题，选择最可能的一个
            if title_candidates:
                main_title, title_index = title_candidates[0]
    
    # 查找Introduction章节标题和其他带数字编号的章节标题
    section_titles = {}  # 保存找到的章节标题 {文本: 页码}
    
    for page_num, page_blocks in enumerate(all_pages_blocks):
        for block in page_blocks:
            text = block[4].strip()
            
            # 查找Introduction
            if is_colored_introduction(text, page_num + 1) or re.match(r'^\d+\.\s*INTRODUCTION$', text, re.IGNORECASE):
                section_titles[text] = page_num
            
            # 查找带数字编号的章节标题，例如"6.3. Model and Data Documentation"
            if is_numbered_section_title(text):
                section_titles[text] = page_num
    
    # 处理每一页
    for page_num, page_blocks in enumerate(all_pages_blocks):
        total_blocks = len(page_blocks)
        
        for block_index, block in enumerate(page_blocks):
            bbox = block[:4]  # 提取文字块的位置信息
            text = block[4]
            
            markdown_tag = ""
            
            # 特殊处理：如果这个块是主标题
            if page_num == 0 and main_title and text.strip() == main_title:
                markdown_tag = "# "
            # 特殊处理：如果这个块是已识别的章节标题
            elif text.strip() in section_titles and section_titles[text.strip()] == page_num:
                markdown_tag = "## "
            else:
                markdown_tag = guess_markdown_tag(text, page_num + 1, block_index, total_blocks, page_blocks, bbox)

            blocks_data.append({
                "text": text.strip(),
                "page": page_num + 1,
                "bbox": [round(x, 2) for x in bbox],
                "source_pdf": os.path.basename(pdf_path),
                "markdown": markdown_tag
            })

    doc.close()
    return blocks_data


def save_to_json(data, pdf_path):
    """
    将结构化的 JSON 数据保存到本地文件
    """
    base_name = os.path.splitext(os.path.basename(pdf_path))[0]
    output_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public", f"{base_name}_structured.json")
    
    # 确保输出目录存在
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"✅ 提取成功，保存到：{output_file}")


if __name__ == "__main__":
    # 从命令行接收参数并执行提取
    import sys
    if len(sys.argv) != 2:
        print("📌 用法: python extract_pdf_to_json_md.py <pdf路径>")
        sys.exit(1)

    pdf_path = sys.argv[1]
    result = extract_blocks_from_pdf(pdf_path)
    save_to_json(result, pdf_path)
