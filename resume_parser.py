import re
import json
import os

try:
    import fitz  # PyMuPDF
except Exception:
    fitz = None

def clean_text(text):
    """Clean text by removing excessive whitespace, repeated characters, and common OCR artifacts."""
    text = re.sub(r'\s+', ' ', text)  # Normalize whitespace
    text = re.sub(r'(\w)\1{2,}', r'\1', text)  # Remove repeated characters (e.g., FFFFF -> F)
    text = text.strip()
    return text

def extract_text_from_pdf(file_path):
    """Extract text from a PDF file using PyMuPDF."""
    try:
        if fitz is None:
            raise RuntimeError("PyMuPDF (fitz) not installed. In fish: source .venv/bin/activate.fish && pip install PyMuPDF")
        doc = fitz.open(file_path)
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
        return clean_text(text)
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return ""

def extract_info_from_text(text):
    """Extract information from resume text with flexible patterns."""
    # Initialize default values
    info = {
        "name": "Not found",
        "email": "Not found",
        "phone": "Not found",
        "linkedin": "Not found",
        "github_profiles": [],
        "education": "Not found",
        "technical_skills": "Not found",
        "projects": {"text": "Not found", "links": []},
        "achievements": "Not found",
        "experience": "Not found",
        "reference": "Not found"
    }

    # Name extraction (flexible for various formats)
    name_patterns = [
        r"(?i)(?:Md|Mr|Ms|Mrs)?\.?\s?([A-Z][a-z]+(?:\s[A-Z][a-z]+){1,4})",  # Standard name with 2-5 words
        r"(?i)^[A-Z\s]+$",  # All caps name at the start (common in some resumes)
        r"(?i)([A-Z][a-z]+\s[A-Z][a-z]+)"  # Simple two-word name
    ]
    for pattern in name_patterns:
        name_match = re.search(pattern, text, re.MULTILINE)
        if name_match:
            info["name"] = name_match.group(0).strip()
            break

    # Email extraction
    email_pattern = r'[\w\.-]+@[\w\.-]+\.\w+'
    email_match = re.search(email_pattern, text)
    if email_match:
        info["email"] = email_match.group(0)

    # Phone number extraction (flexible for +880, spaces, or other formats)
    phone_patterns = [
        r'\+880\s?\d{10}',  # +880 followed by 10 digits
        r'\b\d{11}\b',      # 11-digit number (common in Bangladesh)
        r'\b\d{3}-\d{8}\b'  # Format like 017-7428256
    ]
    for pattern in phone_patterns:
        phone_match = re.search(pattern, text)
        if phone_match:
            info["phone"] = phone_match.group(0)
            break

    # LinkedIn and GitHub extraction
    linkedin_pattern = r'https?://(?:www\.)?linkedin\.com/in/[^\s]+'
    github_pattern = r'https?://github\.com/[^\s]+'
    info["linkedin"] = re.search(linkedin_pattern, text).group(0) if re.search(linkedin_pattern, text) else "Not found"
    info["github_profiles"] = list(set(re.findall(github_pattern, text)))

    # Section headings (case-insensitive, multiple variations)
    section_patterns = {
        "education": r'(?i)(Education|Academic Background|Qualifications|Studies)\s*([\s\S]+?)(?=(?:Technical Skills|Skills|Experience|Projects|Achievements|Extracurricular|Certifications|Reference|$))',
        "technical_skills": r'(?i)(Technical Skills|Skills|Technologies|Proficiencies)\s*([\s\S]+?)(?=(?:Experience|Projects|Achievements|Extracurricular|Certifications|Reference|$))',
        "projects": r'(?i)(Projects|Notable Projects|Portfolio|Work)\s*([\s\S]+?)(?=(?:Achievements|Experience|Extracurricular|Certifications|Reference|$))',
        "achievements": r'(?i)(Achievements|Awards|Honors|Accomplishments|Volunteering)\s*([\s\S]+?)(?=(?:Experience|Extracurricular|Certifications|Reference|$))',
        "experience": r'(?i)(Experience|Work Experience|Professional Experience|Employment)\s*([\s\S]+?)(?=(?:Projects|Achievements|Extracurricular|Certifications|Reference|$))',
        "reference": r'(?i)(Reference|References|Referees)\s*([\s\S]+?)(?=$)'
    }

    # Extract sections
    for key, pattern in section_patterns.items():
        match = re.search(pattern, text)
        if match:
            info[key] = clean_text(match.group(2).strip())
            if key == "projects":
                info["projects"] = {
                    "text": info[key],
                    "links": info["github_profiles"]  # Use all GitHub links found in the document
                }

    return info

def process_resumes(resume_files, base_dir):
    """Process multiple resume files and save extracted info to JSON files."""
    output_folder = os.path.join(base_dir, 'output')
    os.makedirs(output_folder, exist_ok=True)

    for resume_file in resume_files:
        try:
            pdf_path = os.path.join(base_dir, 'resume', resume_file)
            pdf_path = os.path.abspath(pdf_path)
            
            if not os.path.exists(pdf_path):
                print(f"File not found: {pdf_path}")
                continue

            text = extract_text_from_pdf(pdf_path)
            if not text:
                print(f"No text extracted from {resume_file}")
                continue

            info = extract_info_from_text(text)
            
            # Save to JSON
            output_file_name = f"extracted_info_{resume_file.replace('.pdf', '')}.json"
            output_file_path = os.path.join(output_folder, output_file_name)
            with open(output_file_path, 'w', encoding='utf-8') as f:
                json.dump(info, f, indent=4, ensure_ascii=False)
            print(f"Extracted info saved to: {output_file_path}")

        except Exception as e:
            print(f"Error processing {resume_file}: {e}")

# === USAGE ===
base_dir = os.path.dirname(os.path.abspath(__file__))
resume_dir = os.path.join(base_dir, "resume")
resume_files = [f for f in os.listdir(resume_dir) if f.lower().endswith(".pdf")]
process_resumes(resume_files, base_dir)