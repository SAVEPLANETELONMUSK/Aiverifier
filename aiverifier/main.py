# main.py
from fastapi import FastAPI, Request, Form
from fastapi.templating import Jinja2Templates
from fastapi.responses import RedirectResponse
import re

app = FastAPI()
templates = Jinja2Templates(directory="templates")

# Simple regex patterns for link verification
patterns = {
    "YouTube": r"(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+",
    "Facebook": r"(https?:\/\/)?(www\.)?facebook\.com\/.+",
    "Instagram": r"(https?:\/\/)?(www\.)?instagram\.com\/.+",
    "X": r"(https?:\/\/)?(www\.)?x\.com\/.+"
}

# Dummy function to check if content is AI or Human (can expand later)
def check_human_ai(url):
    # For now, just randomly mark as Human (real logic can be added later)
    return "Human"

# Dummy function to get video metadata (title, description, thumbnail)
def get_video_info(url):
    # Placeholder info
    return {
        "title": "Sample Title from Link",
        "description": "This link appears to be safe and from the platform.",
        "thumbnail": "https://upload.wikimedia.org/wikipedia/commons/4/42/YouTube_icon_%282013-2017%29.png"  # Can adjust per platform
    }

@app.get("/")
async def home(request: Request):
    # No result yet, just render homepage
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/")
async def verify(request: Request, url: str = Form(...)):
    result = {}
    platform = None
    for key, pattern in patterns.items():
        if re.match(pattern, url):
            platform = key
            break

    if platform:
        result["status"] = "✅ Verified"
        result["human_ai"] = check_human_ai(url)
        info = get_video_info(url)
        result.update(info)
        result["url"] = url
    else:
        result["status"] = "❌ Invalid Link"
        result["human_ai"] = "Unknown"
        result["title"] = None
        result["description"] = "The link does not match any trusted platform."
        result["thumbnail"] = None
        result["url"] = None

    return templates.TemplateResponse("index.html", {"request": request, "result": result})
