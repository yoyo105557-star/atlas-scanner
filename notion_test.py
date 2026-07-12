import json
import os
import sys
import urllib.error
import urllib.request


NOTION_TOKEN = os.environ.get("NOTION_TOKEN")
DATA_SOURCE_ID = os.environ.get("NOTION_DATA_SOURCE_ID")


def main() -> None:
    if not NOTION_TOKEN:
        raise RuntimeError("Missing NOTION_TOKEN")

    if not DATA_SOURCE_ID:
        raise RuntimeError("Missing NOTION_DATA_SOURCE_ID")

    url = f"https://api.notion.com/v1/databases/{DATA_SOURCE_ID}"

    request = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Bearer {NOTION_TOKEN}",
            "Notion-Version": "2026-03-11",
            "Content-Type": "application/json",
        },
        method="GET",
    )

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            result = json.loads(response.read().decode("utf-8"))

        title = result.get("title", [])
        title_text = "".join(
            item.get("plain_text", "")
            for item in title
            if isinstance(item, dict)
        )

        print("=" * 60)
        print("Atlas Notion API Test")
        print(f"Status: SUCCESS")
        print(f"Data Source ID: {result.get('id')}")
        print(f"Title: {title_text or 'Unknown'}")
        print(f"Properties found: {len(result.get('properties', {}))}")
        print("=" * 60)

    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        print(f"Notion HTTP error: {error.code}")
        print(body)
        sys.exit(1)

    except Exception as error:
        print(f"Notion test failed: {type(error).__name__}: {error}")
        sys.exit(1)


if __name__ == "__main__":
    main()
