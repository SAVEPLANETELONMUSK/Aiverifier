from fastapi import FastAPI, Query
from pydantic import BaseModel
from urllib.parse import urlparse, parse_qs
import requests
from bs4 import BeautifulSoup

app = FastAPI()

class VerificationResult(BaseModel):
    url: str
    valid: bool
    type: str = None
    video_id: str = None
    title: str = None
    description: str = None
    thumbnail: str = None
    reason: str = None


@app.get("/verify/", response_model=VerificationResult)
def verify_url(url: str = Query(..., description="URL to verify")):
    parsed = urlparse(url)

    # ✅ Handle YouTube links
    if "youtube.com" in parsed.netloc or "youtu.be" in parsed.netloc:
        video_id = None

        if "youtu.be" in parsed.netloc:
            video_id = parsed.path.lstrip("/")
        else:
            qs = parse_qs(parsed.query)
            video_id = qs.get("v", [None])[0]

        if not video_id:
            return VerificationResult(url=url, valid=False, reason="No video ID found")

        # Fetch video page
        resp = requests.get(url, headers={"User-Agent": "Mozilla/5.0"})
        if resp.status_code != 200:
            return VerificationResult(url=url, valid=False, reason="Video not reachable")

        soup = BeautifulSoup(resp.text, "html.parser")

        # Extract title
        title = soup.find("title").text.replace("- YouTube", "").strip() if soup.find("title") else None

        # Extract description
        desc_tag = soup.find("meta", {"name": "description"})
        description = desc_tag["content"] if desc_tag else None

        # Thumbnail (standard YouTube image)
        thumbnail = f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"

        return VerificationResult(
            url=url,
            valid=True,
            type="video",
            video_id=video_id,
            title=title,
            description=description,
            thumbnail=thumbnail
        )

    return VerificationResult(url=url, valid=False, reason="Not a supported video link")
