from playwright.sync_api import sync_playwright
import re
import json
import logging
import time
import os

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Base URL for job listings
BASE_URL = "https://jobs.bdjobs.com/jobsearch.asp?fcatId=8&icatId="
JOB_DETAILS_BASE = "https://jobs.bdjobs.com/jobdetails/"

PROJECT_DIR = os.path.dirname(__file__)
RESUME_OUTPUT_DIR = os.path.join(PROJECT_DIR, 'output')
JOB_SKILLS_PATH = os.path.join(PROJECT_DIR, 'job_skills.json')

# --- Skill normalization and matching helpers ---

_SYNONYMS = {
    "js": "javascript",
    "javascript": "javascript",
    "react.js": "react",
    "reactjs": "react",
    "react": "react",
    "nextjs": "next.js",
    "next": "next.js",
    "nodejs": "node.js",
    "node": "node.js",
    "node.js": "node.js",
    "mongodb": "mongodb",
    "mongo": "mongodb",
    "mongoose": "mongoose",
    "postgres": "postgresql",
    "postgresql": "postgresql",
    "mysql": "mysql",
    "sql server": "mssql",
    "mssql": "mssql",
    "redis": "redis",
    "rest api": "rest",
    "restful api": "rest",
    "rest": "rest",
    "api": "api",
    "graphql": "graphql",
    "docker": "docker",
    "kubernetes": "kubernetes",
    "k8s": "kubernetes",
    "cicd": "ci/cd",
    "ci/cd": "ci/cd",
    "git": "git",
    "github": "github",
    "gitlab": "gitlab",
    "bitbucket": "bitbucket",
    "tailwind": "tailwindcss",
    "tailwind css": "tailwindcss",
    "aws": "aws",
    "gcp": "gcp",
    "google cloud": "gcp",
    "azure": "azure",
    "linux": "linux",
    "bash": "bash",
    "python": "python",
    "java": "java",
    "c++": "c++",
    "c#": "c#",
    "dotnet": ".net",
    ".net": ".net",
    "laravel": "laravel",
    "php": "php",
    "vue": "vue.js",
    "vue.js": "vue.js",
    "angular": "angular",
    "selenium": "selenium",
    "cypress": "cypress",
    "appium": "appium",
    "jmeter": "jmeter",
    "playwright": "playwright",
    "jest": "jest",
    "pytest": "pytest",
    "wordPress": "wordpress",
    "wordpress": "wordpress",
}

def _normalize_skill_token(tok: str) -> str:
    t = tok.strip().lower()
    if not t:
        return ""
    # common cleanups
    t = t.replace("+ +", "++")
    t = t.replace("react js", "react")
    t = t.replace("node js", "node.js")
    t = t.replace("tailwindcss", "tailwind css")
    t = t.replace("postgre sql", "postgresql")
    # canonicalize
    return _SYNONYMS.get(t, t)

def _tokenize_to_skills(value) -> set[str]:
    # Accept string or list
    if value is None:
        return set()
    if isinstance(value, list):
        text = " , ".join(map(str, value))
    else:
        text = str(value)

    # split on common delimiters in resumes and job posts
    parts = re.split(r"[,\|/;:\(\)\[\]\{\}·•\-\u2013\u2014\+\n\t]+", text, flags=re.IGNORECASE)
    skills = set()
    for p in parts:
        tok = _normalize_skill_token(p)
        # keep tokens that look like technologies/short phrases
        if len(tok) >= 2 and any(c.isalnum() for c in tok):
            skills.add(tok)
    # second pass: map multi-word known forms
    mapped = set(_SYNONYMS.get(s, s) for s in skills)
    # drop generic noise
    noise = {"experience", "proficiency", "knowledge", "familiarity", "tools", "frameworks", "language", "technologies", "skills"}
    return {s for s in mapped if s not in noise}

def _extract_job_skillset(job: dict) -> set[str]:
    # Combine 'skills' list and keywords from 'requirements'
    skills = set()
    skills |= _tokenize_to_skills(job.get("skills", []))
    # Pull tech keywords from requirement sentences too
    req_text = " . ".join(job.get("requirements", []))
    skills |= _tokenize_to_skills(req_text)
    return skills

def _load_resume_skillsets(output_dir: str) -> list[dict]:
    resumes = []
    if not os.path.isdir(output_dir):
        return resumes
    for name in os.listdir(output_dir):
        if not (name.startswith("extracted_info_") and name.endswith(".json")):
            continue
        path = os.path.join(output_dir, name)
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            tech_str = data.get("technical_skills") or ""
            proj_text = (data.get("projects") or {}).get("text", "")
            resume_skills = _tokenize_to_skills(tech_str) | _tokenize_to_skills(proj_text)
            resumes.append({
                "name": data.get("name") or name.replace("extracted_info_", "").replace(".json", ""),
                "file": path,
                "skills": resume_skills
            })
        except Exception as e:
            logging.warning(f"Failed to load resume JSON {path}: {e}")
    return resumes

def _score_match(resume_skills: set[str], job_skills: set[str]) -> tuple[float, list[str]]:
    if not job_skills:
        return (0.0, [])
    overlap = sorted(resume_skills & job_skills)
    score = len(overlap) / max(1, len(job_skills))
    return (round(score, 4), overlap)

def _rank_jobs_for_resumes(job_data: list[dict], resumes: list[dict]) -> dict:
    results = {}
    for res in resumes:
        ranked = []
        for job in job_data:
            js = _extract_job_skillset(job)
            score, overlap = _score_match(res["skills"], js)
            ranked.append({
                "title": job.get("title", ""),
                "company": job.get("company", ""),
                "url": job.get("url", ""),
                "score": score,
                "matched_skills": overlap,
            })
        ranked.sort(key=lambda x: x["score"], reverse=True)
        results[res["name"]] = ranked
    return results

def get_job_links(page, max_jobs=50):
    job_links = []
    current_page = 1
    seen = set()

    try:
        logging.info(f"Loading job listing page: {BASE_URL}")
        page.goto(BASE_URL, wait_until="domcontentloaded", timeout=60000)

        while len(job_links) < max_jobs:
            # Wait for job listings to load
            page.wait_for_selector('div[role="region"][aria-label="browse jobs section"]', timeout=20000)
            logging.info(f"Processing page {current_page}")

            # Extract job wrappers
            job_wrappers = page.query_selector_all('div.sout-jobs-wrapper')
            prev_count = len(job_links)
            for wrapper in job_wrappers:
                if len(job_links) >= max_jobs:
                    break
                onclick = wrapper.get_attribute('onclick') or ''
                match = re.search(r"DivOpen\('([^']+)',\d+,'([^']+)','([^']+)'\)", onclick)
                if match:
                    params = match.group(1)
                    job_title = match.group(2)
                    company = match.group(3)
                    job_url = f"{JOB_DETAILS_BASE}?{params}"
                    if job_url in seen:
                        continue
                    seen.add(job_url)
                    job_links.append({'url': job_url, 'title': job_title, 'company': company})
                    logging.info(f"Found job: {job_title} at {company}")
            if len(job_links) == prev_count:
                logging.info("No new jobs found on this page. Stopping pagination.")
                break

            # Check for next button
            next_button = page.query_selector('a.prevnext:has-text("Next »")')
            if not next_button or len(job_links) >= max_jobs:
                logging.info("No more pages or reached max jobs.")
                break

            # Click next button and wait for page to refresh
            logging.info("Clicking Next button...")
            next_button.click()
            time.sleep(2)  # Wait for page to load after click
            current_page += 1

        return job_links[:max_jobs]
    except Exception as e:
        logging.error(f"Error fetching job listings: {e}")
        return job_links[:max_jobs]

def get_job_skills_and_requirements(page, job_url):
    skills_list = []
    requirements_list = []

    try:
        logging.info(f"Loading job details page: {job_url}")
        page.goto(job_url, wait_until="domcontentloaded", timeout=60000)

        # Extract skills from skills section
        try:
            page.wait_for_selector('#skills', timeout=10000)
            logging.info("Skills section found.")
            skills = page.query_selector_all('#skills >> div.flex.items-center.flex-wrap.gap-2\\.5 >> button')
            skills_list = [skill.inner_text().strip() for skill in skills]
            logging.info(f"Extracted skills: {skills_list}")
        except Exception:
            logging.info("No skills section found.")

        # Extract requirements from requirements section
        try:
            page.wait_for_selector('#requirements', timeout=10000)
            logging.info("Requirements section found.")
            requirements = page.query_selector_all('#requirements >> ul.list-disc > li')
            for req in requirements:
                text = req.inner_text().strip()
                # Filter for technical skills, tools, and methodologies
                if any(keyword in text.lower() for keyword in [
                    'proficiency', 'experience with', 'knowledge of', 'familiarity with',
                    'testing', 'programming', 'scripting', 'language', 'sql', 'api',
                    'ci/cd', 'containerization', 'sdlc', 'stlc', 'tools', 'frameworks'
                ]) and not any(exclude in text.lower() for exclude in ['age ', 'years']):
                    requirements_list.append(text)
            logging.info(f"Extracted requirements: {requirements_list}")
        except Exception:
            logging.info("No requirements section found.")

        # Remove duplicates within each list while preserving order
        skills_list = list(dict.fromkeys(skills_list))
        requirements_list = list(dict.fromkeys(requirements_list))
        return skills_list, requirements_list
    except Exception as e:
        logging.error(f"Error fetching skills/requirements from {job_url}: {e}")
        return [], []

def main():
    job_data = []
    with sync_playwright() as p:
        logging.info("Setting up Firefox browser...")
        browser = p.firefox.launch(headless=False)
        page = browser.new_page(user_agent="Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0")

        # Reduce for quick test
        job_links = get_job_links(page, max_jobs=10)
        logging.info(f"Found {len(job_links)} job listings")

        try:
            for job in job_links:
                logging.info(f"Scraping skills and requirements for {job['title']} at {job['company']}")
                skills, requirements = get_job_skills_and_requirements(page, job['url'])
                job_data.append({
                    'title': job['title'],
                    'company': job['company'],
                    'url': job['url'],
                    'skills': skills,
                    'requirements': requirements
                })
                # Incremental save so the file exists even mid-run
                with open(JOB_SKILLS_PATH, 'w', encoding='utf-8') as f:
                    json.dump(job_data, f, indent=2, ensure_ascii=False)
                time.sleep(1)
            logging.info(f"Scraping complete. Results saved to {JOB_SKILLS_PATH}")
        finally:
            # Ensure we persist what we have if loop was interrupted
            try:
                with open(JOB_SKILLS_PATH, 'w', encoding='utf-8') as f:
                    json.dump(job_data, f, indent=2, ensure_ascii=False)
                logging.info(f"Wrote partial results to {JOB_SKILLS_PATH}")
            except Exception as e:
                logging.error(f"Failed to write {JOB_SKILLS_PATH}: {e}")
            browser.close()

    # --- Match resumes ---
    resumes = _load_resume_skillsets(RESUME_OUTPUT_DIR)
    if not resumes:
        logging.info("No resume JSONs found in output/. Run resume_parser.py first.")
        return

    if not os.path.exists(JOB_SKILLS_PATH):
        logging.info(f"{JOB_SKILLS_PATH} not found. Run scraping first.")
        return
    with open(JOB_SKILLS_PATH, "r", encoding="utf-8") as f:
        job_data = json.load(f)

    matches = _rank_jobs_for_resumes(job_data, resumes)
    os.makedirs(RESUME_OUTPUT_DIR, exist_ok=True)
    for res_name, ranked in matches.items():
        safe = re.sub(r'[^a-zA-Z0-9_.-]+', '_', res_name)
        out_path = os.path.join(RESUME_OUTPUT_DIR, f"matches_for_{safe}.json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(ranked, f, indent=2, ensure_ascii=False)
        logging.info(f"Wrote matches for {res_name} -> {out_path}")

if __name__ == "__main__":
    main()