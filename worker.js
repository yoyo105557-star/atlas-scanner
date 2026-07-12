const BINANCE_URL =
  "https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=BTCUSDT";

export default {
  async fetch() {
    try {
      const response = await fetch(BINANCE_URL, {
        headers: {
          Accept: "application/json",
          "User-Agent": "Atlas-Scanner/4.0",
        },
      });

      const rawBody = await response.text();

      if (!response.ok) {
        return Response.json(
          {
            atlas: "V4",
            status: "binance_error",
            httpStatus: response.status,
            response: rawBody,
            time: new Date().toISOString(),
          },
          { status: 502 }
        );
      }

      const ticker = JSON.parse(rawBody);

      return Response.json({
        atlas: "V4",
        status: "running",
        source: "Binance USDⓈ-M Futures",
        market: {
          symbol: ticker.symbol,
          lastPrice: Number(ticker.lastPrice),
          priceChangePercent24h: Number(ticker.priceChangePercent),
          quoteVolume24h: Number(ticker.quoteVolume),
          highPrice24h: Number(ticker.highPrice),
          lowPrice24h: Number(ticker.lowPrice),
        },
        time: new Date().toISOString(),
      });
    } catch (error) {
      return Response.json(
        {
          atlas: "V4",
          status: "worker_error",
          error: error instanceof Error ? error.message : String(error),
          time: new Date().toISOString(),
        },
        { status: 500 }
      );
    }
  },
};
