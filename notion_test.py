import json
import os
import sys
import urllib.request

NOTION_TOKEN = os.environ.get("NOTION_TOKEN")

if not NOTION_TOKEN:
    raise RuntimeError("Missing NOTION_TOKEN")

url = "https://api.notion.com/v1/search"

payload = json.dumps({
    "filter": {
        "value": "database",
        "property": "object"
    }
}).encode("utf-8")

request = urllib.request.Request(
    url,
    data=payload,
    headers={
        "Authorization": f"Bearer {NOTION_TOKEN}",
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
    },
    method="POST",
)

try:
    with urllib.request.urlopen(request) as response:
        result = json.loads(response.read().decode("utf-8"))

    print("=" * 60)
    print("Atlas Notion Search Result")
    print("=" * 60)
    print(json.dumps(result, indent=2, ensure_ascii=False))
    print("=" * 60)

except Exception as e:
    print("=" * 60)
    print("ERROR")
    print("=" * 60)
    print(type(e).__name__)
    print(str(e))
    sys.exit(1)
