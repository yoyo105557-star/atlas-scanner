import json
from datetime import datetime, timezone

import websocket


WS_URL = "wss://fstream.binance.com/ws/!ticker@arr"
TOP_LIMIT = 30
TIMEOUT_SECONDS = 20


def format_usdt(value: float) -> str:
    if value >= 1_000_000_000:
        return f"{value / 1_000_000_000:.2f}B"

    if value >= 1_000_000:
        return f"{value / 1_000_000:.2f}M"

    if value >= 1_000:
        return f"{value / 1_000:.2f}K"

    return f"{value:.2f}"


def fetch_all_market_tickers() -> list[dict]:
    connection = websocket.create_connection(
        WS_URL,
        timeout=TIMEOUT_SECONDS,
        header=["User-Agent: Atlas-Scanner/3.1.1"],
    )

    try:
        message = connection.recv()
        data = json.loads(message)

        if not isinstance(data, list):
            raise ValueError("Unexpected Binance WebSocket response")

        return data
    finally:
        connection.close()


def run() -> None:
    print("=" * 76)
    print("Atlas Scanner v3.1.1-ws")
    print(f"UTC Time: {datetime.now(timezone.utc).isoformat()}")
    print("Source: Binance Futures WebSocket")
    print("=" * 76)

    tickers = fetch_all_market_tickers()
    markets = []

    for ticker in tickers:
        symbol = ticker.get("s", "")

        if not symbol.endswith("USDT"):
            continue

        try:
            markets.append(
                {
                    "symbol": symbol,
                    "price": float(ticker["c"]),
                    "change_pct": float(ticker["P"]),
                    "quote_volume": float(ticker["q"]),
                }
            )
        except (KeyError, TypeError, ValueError):
            print(f"Skipped malformed ticker: {symbol}")

    markets.sort(
        key=lambda market: market["quote_volume"],
        reverse=True,
    )

    top_markets = markets[:TOP_LIMIT]

    print(f"USDT markets received: {len(markets)}")
    print(f"Top markets returned: {len(top_markets)}")
    print("-" * 76)

    print(
        f"{'#':<4}"
        f"{'Symbol':<16}"
        f"{'24H Change':>14}"
        f"{'Last Price':>18}"
        f"{'24H Volume':>20}"
    )

    print("-" * 76)

    for index, market in enumerate(top_markets, start=1):
        print(
            f"{index:<4}"
            f"{market['symbol']:<16}"
            f"{market['change_pct']:>13.2f}%"
            f"{market['price']:>18,.8f}"
            f"{format_usdt(market['quote_volume']):>18} U"
        )

    print("=" * 76)
    print("Scanner completed successfully.")


if __name__ == "__main__":
    try:
        run()
    except Exception as error:
        print(f"Scanner failed: {type(error).__name__}: {error}")
        raise SystemExit(1)
