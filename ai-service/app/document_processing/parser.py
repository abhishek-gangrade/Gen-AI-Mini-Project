import os
import re
from typing import List, Dict, Any

def clean_text(text: str) -> str:
    """Normalize whitespace and remove non-printable characters."""
    if not text:
        return ""
    # Replace multiple newlines and carriage returns
    text = re.sub(r'\r\n|\r', '\n', text)
    # Remove control characters except newline and tab
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
    # Collapse 3+ newlines to 2
    text = re.sub(r'\n{3,}', '\n\n', text)
    # Collapse multiple spaces
    text = re.sub(r'[ \t]{2,}', ' ', text)
    return text.strip()

def extract_text_from_pdf(file_path: str) -> List[Dict[str, Any]]:
    """Extract text from PDF page by page."""
    import pypdf
    pages_data = []
    with open(file_path, 'rb') as f:
        reader = pypdf.PdfReader(f)
        for page_num, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            cleaned = clean_text(text)
            if cleaned:
                pages_data.append({"page": page_num + 1, "text": cleaned})
    return pages_data

def extract_text_from_docx(file_path: str) -> List[Dict[str, Any]]:
    """Extract text from Word .docx file."""
    import docx
    doc = docx.Document(file_path)
    full_text = []
    for para in doc.paragraphs:
        if para.text.strip():
            full_text.append(para.text.strip())
    combined = "\n\n".join(full_text)
    cleaned = clean_text(combined)
    return [{"page": 1, "text": cleaned}] if cleaned else []

def extract_text_from_txt(file_path: str) -> List[Dict[str, Any]]:
    """Extract text from plain text file."""
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    cleaned = clean_text(content)
    return [{"page": 1, "text": cleaned}] if cleaned else []

def parse_document(file_path: str, file_type: str) -> List[Dict[str, Any]]:
    """Parse document based on file extension / type."""
    ext = file_type.lower().strip('.')
    if ext == 'pdf':
        return extract_text_from_pdf(file_path)
    elif ext in ['docx', 'doc']:
        return extract_text_from_docx(file_path)
    elif ext in ['txt', 'md']:
        return extract_text_from_txt(file_path)
    else:
        raise ValueError(f"Unsupported file type: {file_type}")

def chunk_text(
    pages_data: List[Dict[str, Any]],
    chunk_size: int = 500,
    chunk_overlap: int = 80
) -> List[Dict[str, Any]]:
    """
    Split extracted text into overlapping chunks while preserving page metadata.
    """
    chunks = []
    chunk_idx = 0

    for page_info in pages_data:
        text = page_info["text"]
        page_num = page_info.get("page", 1)

        # Split by paragraphs or double newlines first
        paragraphs = text.split("\n\n")
        current_chunk = ""

        for para in paragraphs:
            para = para.strip()
            if not para:
                continue

            if len(current_chunk) + len(para) + 2 <= chunk_size:
                if current_chunk:
                    current_chunk += "\n\n" + para
                else:
                    current_chunk = para
            else:
                if current_chunk:
                    chunks.append({
                        "chunk_index": chunk_idx,
                        "text": current_chunk,
                        "page": page_num,
                        "length": len(current_chunk)
                    })
                    chunk_idx += 1

                # If the paragraph itself is larger than chunk_size, split by sentences or character windows
                if len(para) > chunk_size:
                    start = 0
                    while start < len(para):
                        end = min(start + chunk_size, len(para))
                        # Try to break at a space or punctuation
                        if end < len(para):
                            last_space = para.rfind(" ", start, end)
                            if last_space > start + chunk_size // 2:
                                end = last_space
                        sub_text = para[start:end].strip()
                        if sub_text:
                            chunks.append({
                                "chunk_index": chunk_idx,
                                "text": sub_text,
                                "page": page_num,
                                "length": len(sub_text)
                            })
                            chunk_idx += 1
                        start = end - chunk_overlap if end < len(para) else end
                    current_chunk = ""
                else:
                    current_chunk = para

        if current_chunk:
            chunks.append({
                "chunk_index": chunk_idx,
                "text": current_chunk,
                "page": page_num,
                "length": len(current_chunk)
            })
            chunk_idx += 1

    return chunks
