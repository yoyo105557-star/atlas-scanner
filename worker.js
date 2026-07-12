const NOTION_VERSION = "2022-06-28";

export default {
  async fetch(request, env) {
    const headers = {
      "content-type": "application/json; charset=UTF-8",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "content-type, x-atlas-key",
      "access-control-allow-methods": "GET, POST, OPTIONS",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    if (request.method === "GET") {
      return jsonResponse(
        {
          status: "Atlas Worker Ready",
          message: "Send POST JSON to sync a candidate to Notion.",
        },
        200,
        headers
      );
    }

    if (request.method !== "POST") {
      return jsonResponse(
        { status: "error", message: "Method not allowed." },
        405,
        headers
      );
    }

    if (!env.NOTION_TOKEN || !env.NOTION_DATABASE_ID || !env.ATLAS_API_KEY) {
      return jsonResponse(
        {
          status: "error",
          message:
            "Missing NOTION_TOKEN, NOTION_DATABASE_ID, or ATLAS_API_KEY.",
        },
        500,
        headers
      );
    }

    const suppliedKey = request.headers.get("x-atlas-key");

    if (suppliedKey !== env.ATLAS_API_KEY) {
      return jsonResponse(
        { status: "error", message: "Unauthorized." },
        401,
        headers
      );
    }

    try {
      const data = await request.json();
      const candidate = validateCandidate(data);

      const existingPage = await findCandidateByName(
        env,
        candidate.symbol
      );

      const properties = buildNotionProperties(candidate);

      let notionResult;
      let action;

      if (existingPage) {
        notionResult = await notionRequest(
          env,
          `/v1/pages/${existingPage.id}`,
          "PATCH",
          { properties }
        );
        action = "updated";
      } else {
        notionResult = await notionRequest(
          env,
          "/v1/pages",
          "POST",
          {
            parent: {
              database_id: env.NOTION_DATABASE_ID,
            },
            properties,
          }
        );
        action = "created";
      }

      return jsonResponse(
        {
          status: "success",
          action,
          symbol: candidate.symbol,
          notionPageId: notionResult.id,
          syncedAt: new Date().toISOString(),
        },
        200,
        headers
      );
    } catch (error) {
      return jsonResponse(
        {
          status: "error",
          message:
            error instanceof Error ? error.message : String(error),
        },
        400,
        headers
      );
    }
  },
};

function validateCandidate(data) {
  if (!data || typeof data !== "object") {
    throw new Error("JSON body is required.");
  }

  const symbol = String(data.symbol || "")
    .trim()
    .toUpperCase();

  if (!symbol) {
    throw new Error("Missing symbol.");
  }

  const allowedStatuses = [
    "Watching",
    "Ready",
    "Triggered",
    "Rejected",
  ];

  const status = allowedStatuses.includes(data.status)
    ? data.status
    : "Watching";

  return {
    symbol,
    status,
    price: toOptionalNumber(data.price),
    change24h: toOptionalNumber(data.change_24h),
    volume24h: toOptionalNumber(data.volume_24h),
    funding: toOptionalNumber(data.funding),
    atlasScore: toOptionalNumber(data.atlas_score),

    structure1h: normalizeStructure(data.structure_1h),
    structure4h: normalizeStructure(data.structure_4h),

    sector: String(data.sector || "Other"),
    marketRisk: toText(data.market_risk),
    entryZone: toText(data.entry_zone),
    invalidCondition: arrayToText(data.invalid_condition),
    passedConditions: arrayToText(data.passed_conditions),
    pendingConditions: arrayToText(data.pending_conditions),
    aiObservation: toText(data.ai_observation),

    updatedAt: isValidDate(data.updated_at)
      ? data.updated_at
      : new Date().toISOString(),
  };
}

async function findCandidateByName(env, symbol) {
  const result = await notionRequest(
    env,
    `/v1/databases/${env.NOTION_DATABASE_ID}/query`,
    "POST",
    {
      filter: {
        property: "名稱",
        title: {
          equals: symbol,
        },
      },
      page_size: 1,
    }
  );

  return result.results?.[0] || null;
}

function buildNotionProperties(candidate) {
  const properties = {
    名稱: {
      title: [
        {
          text: {
            content: candidate.symbol,
          },
        },
      ],
    },

    交易對: {
      rich_text: [
        {
          text: {
            content: candidate.symbol,
          },
        },
      ],
    },

    狀態: {
      select: {
        name: candidate.status,
      },
    },

    板塊: {
      select: {
        name: candidate.sector,
      },
    },

    市場風險: richTextProperty(candidate.marketRisk),
    建議進場區: richTextProperty(candidate.entryZone),
    失效條件: richTextProperty(candidate.invalidCondition),
    通過條件: richTextProperty(candidate.passedConditions),
    未通過條件: richTextProperty(candidate.pendingConditions),
    AI觀察: richTextProperty(candidate.aiObservation),

    最後掃描: {
      date: {
        start: candidate.updatedAt,
      },
    },
  };

  setNumber(properties, "24H漲幅%", candidate.change24h);
  setNumber(properties, "24H成交額USDT", candidate.volume24h);
  setNumber(properties, "Funding%", candidate.funding);
  setNumber(properties, "Atlas Score", candidate.atlasScore);

  if (candidate.structure1h) {
    properties["1H結構"] = {
      select: { name: candidate.structure1h },
    };
  }

  if (candidate.structure4h) {
    properties["4H結構"] = {
      select: { name: candidate.structure4h },
    };
  }

  return properties;
}

async function notionRequest(env, path, method, body) {
  const response = await fetch(`https://api.notion.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.NOTION_TOKEN}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const raw = await response.text();

  let result;

  try {
    result = JSON.parse(raw);
  } catch {
    result = { raw };
  }

  if (!response.ok) {
    const message =
      result?.message ||
      result?.raw ||
      `Notion API returned HTTP ${response.status}`;

    throw new Error(message);
  }

  return result;
}

function jsonResponse(data, status, headers) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers,
  });
}

function richTextProperty(value) {
  if (!value) {
    return { rich_text: [] };
  }

  return {
    rich_text: [
      {
        text: {
          content: value.slice(0, 1900),
        },
      },
    ],
  };
}

function setNumber(properties, name, value) {
  if (value !== null) {
    properties[name] = {
      number: value,
    };
  }
}

function toOptionalNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function toText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function arrayToText(value) {
  if (Array.isArray(value)) {
    return value.map(String).join("；");
  }

  return toText(value);
}

function normalizeStructure(value) {
  const mapping = {
    Bullish: "多頭",
    Neutral: "中性",
    Bearish: "空頭",
    多頭: "多頭",
    中性: "中性",
    空頭: "空頭",
  };

  return mapping[value] || null;
}

function isValidDate(value) {
  if (!value) {
    return false;
  }

  return !Number.isNaN(Date.parse(value));
}
