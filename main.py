import os
import shutil
import tempfile
import threading
import json
import re
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import uvicorn

from typing import Optional

app = FastAPI()

# Import your scraper as a function
# I will assume you place your scraper.py logic into a function like `run_scraper_for_skills(skills: list[str]) -> list[dict]`
# and similarly a function for resume parsing: parse_resume(file_path) -> dict

# Let's define minimal wrapper functions to use your existing code:

# --- Resume parsing (use your parser code here) ---
def parse_resume(file_path: str) -> dict:
    import fitz  # PyMuPDF
    import re

    def clean_text(text: str) -> str:
        text = re.sub(r'\s+', ' ', text)
        text = re.sub(r'(\w)\1{2,}', r'\1', text)
        return text.strip()

    doc = fitz.open(file_path)
    text = ""
    for page in doc:
        text += page.get_text()
    doc.close()
    text = clean_text(text)

    # Extract technical skills - very simple example
    tech_skills = "Not found"
    match = re.search(r'(?i)(Technical Skills|Skills|Technologies)[\s:]*([\w\s,.;-]+)', text)
    if match:
        tech_skills = match.group(2)

    info = {
        "technical_skills": tech_skills
    }
    return info

# --- Scraper runner wrapper ---
def run_scraper_for_skills(skills: list[str]) -> list[dict]:
    # Your scraper.py main logic adapted to accept skills and return jobs data

    from playwright.sync_api import sync_playwright
    import re
    import time
    import logging

    BASE_URL = "https://jobs.bdjobs.com/jobsearch.asp?fcatId=8&icatId="
    JOB_DETAILS_BASE = "https://jobs.bdjobs.com/jobdetails/"

    logging.basicConfig(level=logging.INFO)

    def get_job_links(page, skill, max_jobs=10):
        job_links = []
        seen = set()

        query = skill.replace(" ", "+")
        url = f"https://jobs.bdjobs.com/jobsearch.asp?key={query}"

        page.goto(url, wait_until="domcontentloaded", timeout=60000)
        page.wait_for_selector('div.sout-jobs-wrapper', timeout=20000)

        while len(job_links) < max_jobs:
            job_wrappers = page.query_selector_all('div.sout-jobs-wrapper')
            if not job_wrappers:
                break
            for wrapper in job_wrappers:
                if len(job_links) >= max_jobs:
                    break
                onclick = wrapper.get_attribute('onclick') or ''
                match = re.search(r"DivOpen\('([^']+)',\d+,'([^']+)','([^']+)'\)", onclick)
                if not match:
                    continue
                params = match.group(1)
                job_title = match.group(2)
                company = match.group(3)
                job_url = f"{JOB_DETAILS_BASE}?{params}"
                if job_url in seen:
                    continue
                seen.add(job_url)
                job_links.append({
                    'url': job_url,
                    'title': job_title,
                    'company': company
                })
            # try next page
            next_btn = page.query_selector('a.prevnext:has-text("Next »")')
            if not next_btn or len(job_links) >= max_jobs:
                break
            next_btn.click()
            time.sleep(2)
            page.wait_for_selector('div.sout-jobs-wrapper', timeout=20000)
        return job_links

    def get_job_skills_and_requirements(page, job_url):
        skills_list = []
        requirements_list = []

        page.goto(job_url, wait_until="domcontentloaded", timeout=60000)
        try:
            page.wait_for_selector('#skills', timeout=10000)
            skills = page.query_selector_all('#skills >> div.flex.items-center.flex-wrap.gap-2\\.5 >> button')
            skills_list = [skill.inner_text().strip() for skill in skills]
        except Exception:
            pass
        try:
            page.wait_for_selector('#requirements', timeout=10000)
            requirements = page.query_selector_all('#requirements >> ul.list-disc > li')
            for req in requirements:
                text = req.inner_text().strip()
                if any(k in text.lower() for k in ['proficiency', 'experience', 'knowledge', 'familiarity', 'testing', 'programming', 'scripting', 'language', 'sql', 'api']):
                    requirements_list.append(text)
        except Exception:
            pass
        # Remove duplicates
        skills_list = list(dict.fromkeys(skills_list))
        requirements_list = list(dict.fromkeys(requirements_list))
        return skills_list, requirements_list

    results = []
    with sync_playwright() as p:
        browser = p.firefox.launch(headless=False)
        page = browser.new_page()
        for skill in skills:
            logging.info(f"Searching for jobs with skill: {skill}")
            job_links = get_job_links(page, skill, max_jobs=5)
            for job in job_links:
                skills_, reqs = get_job_skills_and_requirements(page, job['url'])
                results.append({
                    "title": job['title'],
                    "company": job['company'],
                    "url": job['url'],
                    "skills": skills_,
                    "requirements": reqs,
                })
        browser.close()
    return results

def extract_skills(tech_skills_str: str) -> list[str]:
    if not tech_skills_str or tech_skills_str == "Not found":
        return []
    # Split by common delimiters
    skills = re.split(r'[;,|\n]+', tech_skills_str)
    return [s.strip().lower() for s in skills if s.strip()]


@app.post("/upload_resume")
async def upload_resume(file: UploadFile = File(...)):
    try:
        # Save uploaded file temporarily
        suffix = os.path.splitext(file.filename)[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            shutil.copyfileobj(file.file, tmp)
            temp_path = tmp.name

        # Parse resume for skills (blocking)
        parsed = parse_resume(temp_path)

        skills = extract_skills(parsed.get("technical_skills", ""))

        if not skills:
            skills = ["software developer"]  # fallback

        # Run the scraper in a thread because it's sync and blocking
        scraped_jobs = []
        def scraper_thread():
            nonlocal scraped_jobs
            scraped_jobs = run_scraper_for_skills(skills)

        thread = threading.Thread(target=scraper_thread)
        thread.start()
        thread.join()

        # Clean up temp file
        os.unlink(temp_path)

        return JSONResponse({
            "parsed_resume": parsed,
            "searched_skills": skills,
            "scraped_jobs": scraped_jobs
        })

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=5000, reload=True)