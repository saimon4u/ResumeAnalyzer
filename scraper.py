from playwright.sync_api import sync_playwright
import re
import json
import logging
import time

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Base URL for job listings
BASE_URL = "https://jobs.bdjobs.com/jobsearch.asp?fcatId=8&icatId="
JOB_DETAILS_BASE = "https://jobs.bdjobs.com/jobdetails/"

def get_job_links(page, max_jobs=50):
    job_links = []
    current_page = 1
    
    try:
        logging.info(f"Loading job listing page: {BASE_URL}")
        page.goto(BASE_URL, wait_until="domcontentloaded", timeout=60000)
        
        while len(job_links) < max_jobs:
            # Wait for job listings to load
            page.wait_for_selector('div[role="region"][aria-label="browse jobs section"]', timeout=20000)
            logging.info(f"Processing page {current_page}")
            
            # Extract job wrappers
            job_wrappers = page.query_selector_all('div.sout-jobs-wrapper')
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
                    job_links.append({
                        'url': job_url,
                        'title': job_title,
                        'company': company
                    })
                    logging.info(f"Found job: {job_title} at {company}")
            
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
        browser = p.firefox.launch(headless=False)  # Non-headless for debugging
        page = browser.new_page(user_agent="Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0")
        
        # Get up to 50 job links
        job_links = get_job_links(page, max_jobs=50)
        logging.info(f"Found {len(job_links)} job listings")
        
        # Scrape skills and requirements for each job
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
            time.sleep(1)  # Be polite to the server
        
        # Save results to a JSON file
        with open('job_skills.json', 'w', encoding='utf-8') as f:
            json.dump(job_data, f, indent=2, ensure_ascii=False)
        logging.info("Scraping complete. Results saved to job_skills.json")
        
        browser.close()

if __name__ == "__main__":
    main()