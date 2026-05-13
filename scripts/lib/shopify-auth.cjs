/* eslint-disable no-console */

const DEFAULT_API_VERSION = process.env.SHOPIFY_API_VERSION || "2026-04";

let cached = {
  accessToken: null,
  expiresAtMs: 0,
  scope: "",
  source: "",
};

function nowMs() {
  return Date.now();
}

function normalizeStore(store) {
  return String(store || "")
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");
}

function resolveOauthShop() {
  // Canonical OAuth shop. For this project, use lacocheraplace.myshopify.com.
  return normalizeStore(
    process.env.SHOPIFY_SHOP ||
      process.env.SHOPIFY_SHOP_DOMAIN ||
      process.env.SHOPIFY_STORE ||
      process.env.SHOPIFY_STORE_DOMAIN ||
      process.env.SHOP ||
      "",
  );
}

function resolveGraphqlShop() {
  // Allow explicit override if needed, defaulting to canonical OAuth shop.
  return normalizeStore(
    process.env.SHOPIFY_GRAPHQL_SHOP || process.env.SHOPIFY_ADMIN_SHOP || resolveOauthShop(),
  );
}

function getClientCreds() {
  return {
    clientId: process.env.SHOPIFY_CLIENT_ID || process.env.SHOPIFY_API_KEY || "",
    clientSecret: process.env.SHOPIFY_CLIENT_SECRET || process.env.SHOPIFY_API_SECRET || "",
  };
}

function requireShop() {
  const shop = resolveOauthShop();
  if (!shop) {
    throw new Error("Falta SHOPIFY_SHOP (recomendado) o SHOPIFY_STORE.");
  }
  return shop;
}

function hasValidCachedToken() {
  return Boolean(cached.accessToken && nowMs() < cached.expiresAtMs);
}

async function requestClientCredentialsToken({ shop, clientId, clientSecret, log = true }) {
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  let payload = {};
  try {
    payload = await res.json();
  } catch {
    payload = {};
  }

  if (!res.ok) {
    throw new Error(
      `Token request failed HTTP ${res.status}: ${JSON.stringify(payload).slice(0, 400)}`,
    );
  }

  const accessToken = payload.access_token || "";
  if (!accessToken) {
    throw new Error(`Token response sin access_token: ${JSON.stringify(payload).slice(0, 400)}`);
  }

  const expiresInSec = Number(payload.expires_in || 3600);
  const renewBufferSec = Math.min(300, Math.max(30, Math.floor(expiresInSec * 0.1)));
  const expiresAtMs = nowMs() + Math.max(1, expiresInSec - renewBufferSec) * 1000;
  const scopes = payload.scope || payload.scopes || "";

  cached = {
    accessToken,
    expiresAtMs,
    scope: scopes,
    source: "client_credentials",
  };

  if (log) {
    console.log(
      `[shopify-auth] token obtenido correctamente | source=client_credentials | expires_in=${expiresInSec}s | scopes=${scopes || "(no informado)"}`,
    );
  }

  return {
    accessToken,
    expiresInSec,
    scope: scopes,
    source: "client_credentials",
  };
}

async function getShopifyAccessToken({ forceRefresh = false, log = true } = {}) {
  const shop = requireShop();
  if (!forceRefresh && hasValidCachedToken()) {
    if (log) {
      const ttlSec = Math.max(0, Math.floor((cached.expiresAtMs - nowMs()) / 1000));
      console.log(`[shopify-auth] token cache hit | source=${cached.source} | ttl=${ttlSec}s`);
    }
    return {
      accessToken: cached.accessToken,
      source: cached.source,
      scope: cached.scope,
      expiresInSec: Math.max(0, Math.floor((cached.expiresAtMs - nowMs()) / 1000)),
    };
  }

  const { clientId, clientSecret } = getClientCreds();
  if (clientId && clientSecret) {
    return requestClientCredentialsToken({ shop, clientId, clientSecret, log });
  }

  // Legacy fallback is optional and explicit.
  if (
    process.env.SHOPIFY_ENABLE_LEGACY_FALLBACK === "true" &&
    process.env.SHOPIFY_ADMIN_TOKEN
  ) {
    const legacyToken = String(process.env.SHOPIFY_ADMIN_TOKEN).trim();
    cached = {
      accessToken: legacyToken,
      expiresAtMs: nowMs() + 10 * 60 * 1000,
      scope: "legacy_token",
      source: "legacy_shopify_admin_token",
    };
    if (log) {
      console.log(
        "[shopify-auth] fallback legacy token enabled (SHOPIFY_ENABLE_LEGACY_FALLBACK=true).",
      );
    }
    return {
      accessToken: legacyToken,
      source: "legacy_shopify_admin_token",
      scope: "legacy_token",
      expiresInSec: 600,
    };
  }

  throw new Error(
    "No hay credenciales válidas. Define SHOPIFY_SHOP + SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET. Fallback legacy solo si SHOPIFY_ENABLE_LEGACY_FALLBACK=true.",
  );
}

async function shopifyGraphQL(query, variables = {}, { apiVersion = DEFAULT_API_VERSION, log = false } = {}) {
  const shop = resolveGraphqlShop() || requireShop();
  const tokenInfo = await getShopifyAccessToken({ log });
  const endpoint = `https://${shop}/admin/api/${apiVersion}/graphql.json`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": tokenInfo.accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  let payload = {};
  try {
    payload = await res.json();
  } catch {
    payload = {};
  }

  if (!res.ok) {
    throw new Error(`GraphQL HTTP ${res.status}: ${JSON.stringify(payload).slice(0, 500)}`);
  }
  if (payload.errors?.length) {
    throw new Error(`GraphQL errors: ${JSON.stringify(payload.errors).slice(0, 500)}`);
  }
  return payload.data;
}

async function verifyShopifyConnection({ apiVersion = DEFAULT_API_VERSION } = {}) {
  const data = await shopifyGraphQL(
    `#graphql
      query VerifyConnection {
        shop {
          name
          myshopifyDomain
        }
      }`,
    {},
    { apiVersion, log: true },
  );
  console.log(
    `[shopify-auth] verify ok | shop=${data.shop.name} | myshopifyDomain=${data.shop.myshopifyDomain}`,
  );
  return data.shop;
}

module.exports = {
  resolveOauthShop,
  resolveGraphqlShop,
  getShopifyAccessToken,
  shopifyGraphQL,
  verifyShopifyConnection,
};
