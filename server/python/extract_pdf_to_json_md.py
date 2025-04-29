#!/usr/bin/env python3

import os
import json
import sys
from datetime import datetime

try:
    import fitz  # PyMuPDF
except ImportError:
    print("Error: PyMuPDF (fitz) module not found. Please install it using: pip install PyMuPDF", file=sys.stderr)
    sys.exit(1)

def extract_text_from_pdf(pdf_path):
    """
    Extract text from PDF
    """
    try:
        print(f"Opening PDF file: {pdf_path}", file=sys.stderr)
        doc = fitz.open(pdf_path)
        
        print(f"PDF opened successfully. Pages: {len(doc)}", file=sys.stderr)
        text_blocks = []
        for page_num in range(len(doc)):
            print(f"Processing page {page_num + 1}/{len(doc)}", file=sys.stderr)
            page = doc[page_num]
            blocks = page.get_text("blocks")
            for block in blocks:
                text_blocks.append({
                    "text": block[4],
                    "page": page_num + 1,
                    "bbox": [round(x, 2) for x in block[:4]]
                })
        
        doc.close()
        print(f"Successfully extracted {len(text_blocks)} text blocks", file=sys.stderr)
        return text_blocks
        
    except fitz.FileDataError as e:
        print(f"Error: Invalid or corrupted PDF file: {str(e)}", file=sys.stderr)
        raise
    except Exception as e:
        print(f"Error processing PDF: {str(e)}", file=sys.stderr)
        raise

def process_pdf(pdf_path):
    """
    Process PDF file and generate JSON output
    """
    try:
        # Get filename
        filename = os.path.basename(pdf_path)
        print(f"Processing file: {filename}", file=sys.stderr)
        
        # Extract text
        text_blocks = extract_text_from_pdf(pdf_path)
        
        # Create output structure
        output = {
            "title": os.path.splitext(filename)[0],
            "processed_date": datetime.now().isoformat(),
            "content": text_blocks,
            "metadata": {
                "filename": filename,
                "file_size": os.path.getsize(pdf_path),
                "block_count": len(text_blocks),
                "created_at": datetime.now().isoformat()
            }
        }
        
        # Ensure output directory exists
        output_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'public', 'json')
        os.makedirs(output_dir, exist_ok=True)
        print(f"Output directory: {output_dir}", file=sys.stderr)
        
        # Generate output file path
        output_filename = os.path.splitext(filename)[0] + '_structured.json'
        output_path = os.path.join(output_dir, output_filename)
        print(f"Output file path: {output_path}", file=sys.stderr)
        
        # Write JSON file
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(output, f, ensure_ascii=False, indent=2)
            
        print(f"Successfully processed {filename}", file=sys.stderr)
        print(f"Output saved to {output_path}", file=sys.stderr)
        return True
        
    except Exception as e:
        print(f"Error processing PDF: {str(e)}", file=sys.stderr)
        return False

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python extract_pdf_to_json_md.py <pdf_file_path>", file=sys.stderr)
        sys.exit(1)
        
    pdf_path = sys.argv[1]
    print(f"Input PDF path: {pdf_path}", file=sys.stderr)
    
    if not os.path.exists(pdf_path):
        print(f"Error: File not found: {pdf_path}", file=sys.stderr)
        sys.exit(1)
        
    try:
        success = process_pdf(pdf_path)
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"Fatal error: {str(e)}", file=sys.stderr)
        sys.exit(1)