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
}).encode()

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
        result = json.loads(response.read().decode())

    print("=" * 60)

    for db in result["results"]:
        title = ""

        if db["title"]:
            title = "".join(
                t["plain_text"]
                for t in db["title"]
            )

        print(title)
        print(db["id"])
        print("-" * 40)

    print("=" * 60)

except Exception as e:
    print(e)
    sys.exit(1)
