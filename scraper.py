from playwright.sync_api import sync_playwright
import re
import json
import logging
import time
import os
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import pdfplumber

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Constants
BASE_URL = "https://jobs.bdjobs.com/jobsearch.asp?fcatId=8&icatId="
JOB_DETAILS_BASE = "https://jobs.bdjobs.com/jobdetails/"
PROJECT_DIR = os.path.dirname(__file__)
RESUME_OUTPUT_DIR = os.path.join(PROJECT_DIR, 'output')

# Skill synonyms
_SYNONYMS = {
    "js": "javascript", "javascript": "javascript",
    "react.js": "react", "reactjs": "react", "react": "react",
    "nextjs": "next.js", "next": "next.js",
    "nodejs": "node.js", "node": "node.js", "node.js": "node.js",
    "mongodb": "mongodb", "mongo": "mongodb",
    "postgres": "postgresql", "postgresql": "postgresql",
    "mysql": "mysql",
    "sql server": "mssql", "mssql": "mssql",
    "redis": "redis",
    "rest api": "rest", "restful api": "rest", "rest": "rest", "api": "api",
    "graphql": "graphql",
    "docker": "docker", "kubernetes": "kubernetes", "k8s": "kubernetes",
    "cicd": "ci/cd", "ci/cd": "ci/cd",
    "git": "git", "github": "github", "gitlab": "gitlab", "bitbucket": "bitbucket",
    "tailwind": "tailwindcss", "tailwind css": "tailwindcss",
    "aws": "aws", "gcp": "gcp", "google cloud": "gcp", "azure": "azure",
    "linux": "linux", "bash": "bash",
    "python": "python", "java": "java", "c++": "c++", "c#": "c#",
    "dotnet": ".net", ".net": ".net",
    "laravel": "laravel", "php": "php",
    "vue": "vue.js", "vue.js": "vue.js",
    "angular": "angular",
    "selenium": "selenium", "cypress": "cypress", "appium": "appium",
    "jmeter": "jmeter", "playwright": "playwright", "jest": "jest", "pytest": "pytest",
    "wordpress": "wordpress",
}

app = FastAPI()

# CORS
origins = [
    "http://localhost:5173",  # your React frontend
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,        # allow only frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- Skill Helpers ----------------
def _normalize_skill_token(tok: str) -> str:
    t = tok.strip().lower().replace("+ +", "++").replace("react js", "react").replace("node js", "node.js")
    t = t.replace("tailwindcss", "tailwind css").replace("postgre sql", "postgresql")
    t = t.strip(".,;:·•")
    return _SYNONYMS.get(t, t)

def _tokenize_to_skills(value) -> set[str]:
    if value is None:
        return set()
    if isinstance(value, list):
        text = " , ".join(map(str, value))
    else:
        text = str(value)
    parts = re.split(r"[,\|/;:\(\)\[\]\{\}·•\-\u2013\u2014\+\n\t]+", text, flags=re.IGNORECASE)
    skills = {_normalize_skill_token(p) for p in parts if len(_normalize_skill_token(p)) >= 2}
    noise = {"experience", "proficiency", "knowledge", "familiarity", "tools", "frameworks", "language", "technologies", "skills"}
    return {s for s in skills if s not in noise}

# ---------------- Resume Parsing ----------------
def parse_pdf_resume(file_path: str) -> dict:
    text = ""
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            text += page.extract_text() + "\n"

    lines = [line.strip() for line in text.splitlines() if line.strip()]
    name = lines[0] if lines else "Unknown"

    skills_section = ""
    match = re.search(r"(?:Skills|Technical Skills)\s*[:\-]?\s*(.+?)(?:\n\n|\n[A-Z][a-z]|$)", text, re.IGNORECASE | re.DOTALL)
    if match:
        skills_section = match.group(1)
    technical_skills = [s.strip() for s in re.split(r"[,\|;\n]+", skills_section) if s.strip()]

    projects_section = ""
    match_proj = re.search(r"(?:Projects|Project Experience)\s*[:\-]?\s*(.+?)(?:\n\n|\n[A-Z][a-z]|$)", text, re.IGNORECASE | re.DOTALL)
    if match_proj:
        projects_section = match_proj.group(1).strip()

    return {"name": name, "technical_skills": technical_skills, "projects": projects_section}

# ---------------- Job Scraping ----------------
def get_job_links(page, max_jobs=50):
    job_links = []
    seen = set()
    page.goto(BASE_URL, wait_until="domcontentloaded", timeout=60000)

    while len(job_links) < max_jobs:
        page.wait_for_selector('div.sout-jobs-wrapper', timeout=20000)
        job_wrappers = page.query_selector_all('div.sout-jobs-wrapper')
        for wrapper in job_wrappers:
            if len(job_links) >= max_jobs:
                break
            onclick = wrapper.get_attribute('onclick') or ''
            match = re.search(r"DivOpen\('([^']+)',\d+,'([^']+)','([^']+)'\)", onclick)
            if match:
                params, title, company = match.group(1), match.group(2), match.group(3)
                url = f"{JOB_DETAILS_BASE}?{params}"
                if url not in seen:
                    seen.add(url)
                    job_links.append({'url': url, 'title': title, 'company': company})
        next_button = page.query_selector('a.prevnext:has-text("Next »")')
        if not next_button:
            break
        next_button.click()
        time.sleep(2)
    return job_links[:max_jobs]

def get_job_skills_and_requirements(page, job_url):
    skills_list, requirements_list = [], []
    page.goto(job_url, wait_until="domcontentloaded", timeout=60000)
    try:
        page.wait_for_selector('#skills', timeout=5000)
        skills_list = [b.inner_text().strip() for b in page.query_selector_all('#skills >> button')]
    except: pass
    try:
        page.wait_for_selector('#requirements', timeout=5000)
        requirements_list = [li.inner_text().strip() for li in page.query_selector_all('#requirements >> ul.list-disc > li')]
    except: pass
    return skills_list, requirements_list

def _extract_job_skillset(job: dict) -> set[str]:
    skills = _tokenize_to_skills(job.get("skills", []))
    req_text = " . ".join(job.get("requirements", []))
    skills |= _tokenize_to_skills(req_text)
    return skills

def _score_match(resume_skills: set[str], job_skills: set[str]) -> tuple[float, list[str]]:
    overlap = sorted(resume_skills & job_skills)
    score = len(overlap) / max(1, len(job_skills))
    return (round(score, 4), overlap)

# ---------------- API Models ----------------
class ResumeInput(BaseModel):
    name: str
    technical_skills: List[str] = []
    projects: str = ""

# ---------------- API Endpoints ----------------
@app.post("/upload_resume")
async def upload_resume(file: UploadFile = File(...)):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    # Ensure output directory exists
    os.makedirs(RESUME_OUTPUT_DIR, exist_ok=True)
    
    # Save the uploaded PDF
    save_path = os.path.join(RESUME_OUTPUT_DIR, file.filename)
    with open(save_path, "wb") as f:
        f.write(await file.read())

    # Parse resume
    resume_data = parse_pdf_resume(save_path)

    # Convert parsed skills to match /match-jobs input
    normalized_skills = list(_tokenize_to_skills(resume_data["technical_skills"]) | _tokenize_to_skills(resume_data["projects"]))

    # Return in the exact format expected by /match-jobs
    match_jobs_input = {
        "name": resume_data["name"],
        "technical_skills": normalized_skills,
        "projects": resume_data["projects"]
    }

    return match_jobs_input



@app.post("/match-jobs")
def match_jobs(resume: ResumeInput):
    resume_skills = _tokenize_to_skills(resume.technical_skills) | _tokenize_to_skills(resume.projects)
    resume_data = {"name": resume.name, "skills": resume_skills}

    job_data = []
    with sync_playwright() as p:
        browser = p.firefox.launch(headless=True)
        page = browser.new_page(user_agent="Mozilla/5.0")
        job_links = get_job_links(page, max_jobs=10)
        for job in job_links:
            skills, requirements = get_job_skills_and_requirements(page, job["url"])
            job_data.append({"title": job["title"], "company": job["company"], "url": job["url"], "skills": skills, "requirements": requirements})
            time.sleep(1)
        browser.close()

    results = []
    for job in job_data:
        js = _extract_job_skillset(job)
        score, overlap = _score_match(resume_data["skills"], js)
        results.append({
            "title": job["title"], "company": job["company"], "url": job["url"],
            "score": score, "matched_skills": overlap, "requirements": job.get("requirements", [])
        })
    results.sort(key=lambda x: x["score"], reverse=True)
    return {"resume": resume.name, "matches": results}
