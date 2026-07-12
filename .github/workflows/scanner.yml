from datetime import datetime, timezone
from typing import Any

import requests


BASE_URL = "https://fapi.binance.com"
TOP_LIMIT = 30
REQUEST_TIMEOUT = 20


def get_json(endpoint: str) -> Any:
    """Fetch public Binance Futures market data."""
    url = f"{BASE_URL}{endpoint}"

    response = requests.get(
        url,
        timeout=REQUEST_TIMEOUT,
        headers={"User-Agent": "Atlas-Scanner/3.1.1"},
    )
    response.raise_for_status()

    return response.json()


def get_active_usdt_perpetual_symbols() -> set[str]:
    """Return active USDT-margined perpetual futures symbols."""
    exchange_info = get_json("/fapi/v1/exchangeInfo")

    symbols: set[str] = set()

    for item in exchange_info.get("symbols", []):
        if (
            item.get("quoteAsset") == "USDT"
            and item.get("contractType") == "PERPETUAL"
            and item.get("status") == "TRADING"
        ):
            symbols.add(item["symbol"])

    return symbols


def get_top_markets(
    active_symbols: set[str],
    limit: int = TOP_LIMIT,
) -> list[dict[str, float | str]]:
    """Rank active contracts by 24-hour quote volume."""
    tickers = get_json("/fapi/v1/ticker/24hr")
    markets: list[dict[str, float | str]] = []

    for ticker in tickers:
        symbol = ticker.get("symbol")

        if symbol not in active_symbols:
            continue

        try:
            markets.append(
                {
                    "symbol": symbol,
                    "price": float(ticker["lastPrice"]),
                    "change_pct": float(ticker["priceChangePercent"]),
                    "quote_volume": float(ticker["quoteVolume"]),
                }
            )
        except (KeyError, TypeError, ValueError):
            print(f"Skipped malformed ticker: {symbol}")

    markets.sort(
        key=lambda market: float(market["quote_volume"]),
        reverse=True,
    )

    return markets[:limit]


def format_usdt(value: float) -> str:
    if value >= 1_000_000_000:
        return f"{value / 1_000_000_000:.2f}B"

    if value >= 1_000_000:
        return f"{value / 1_000_000:.2f}M"

    if value >= 1_000:
        return f"{value / 1_000:.2f}K"

    return f"{value:.2f}"


def run() -> None:
    started_at = datetime.now(timezone.utc)

    print("=" * 76)
    print("Atlas Scanner v3.1.1")
    print(f"UTC Time: {started_at.isoformat()}")
    print("Mode: Public market-data scan only")
    print("=" * 76)

    active_symbols = get_active_usdt_perpetual_symbols()
    top_markets = get_top_markets(active_symbols)

    print(f"Active USDT perpetual contracts: {len(active_symbols)}")
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
        symbol = str(market["symbol"])
        price = float(market["price"])
        change_pct = float(market["change_pct"])
        quote_volume = float(market["quote_volume"])

        print(
            f"{index:<4}"
            f"{symbol:<16}"
            f"{change_pct:>13.2f}%"
            f"{price:>18,.8f}"
            f"{format_usdt(quote_volume):>18} U"
        )

    print("=" * 76)
    print("Scanner completed successfully.")


if __name__ == "__main__":
    try:
        run()
    except requests.RequestException as error:
        print(f"Binance API request failed: {error}")
        raise SystemExit(1)
    except Exception as error:
        print(f"Unexpected scanner error: {error}")
        raise SystemExit(1)
