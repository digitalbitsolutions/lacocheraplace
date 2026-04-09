import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export async function requireOwnerAdmin(request: Request) {
  const context = await authenticate.admin(request);
  const ownerStatus = await getEmbeddedOwnerStatus(
    request,
    context.session.shop,
    Boolean(context.session?.accountOwner),
  );

  if (!ownerStatus.accountOwner) {
    throw json(
      {
        message:
          "Solo el owner de la tienda puede acceder a la consola de solicitudes de proveedores.",
      },
      { status: 403 },
    );
  }

  return context;
}

async function getEmbeddedOwnerStatus(
  request: Request,
  shop: string,
  sessionFallback: boolean,
) {
  const rawSessionToken =
    request.headers.get("authorization")?.replace("Bearer ", "") ||
    new URL(request.url).searchParams.get("id_token");

  if (!rawSessionToken) {
    return {
      accountOwner: sessionFallback,
    };
  }

  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_API_KEY,
      client_secret: process.env.SHOPIFY_API_SECRET,
      grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
      subject_token: rawSessionToken,
      subject_token_type: "urn:ietf:params:oauth:token-type:id_token",
      requested_token_type:
        "urn:shopify:params:oauth:token-type:online-access-token",
      expiring: "1",
    }),
  });

  if (!response.ok) {
    return {
      accountOwner: sessionFallback,
    };
  }

  const payload = (await response.json()) as {
    associated_user?: { account_owner?: boolean };
  };

  return {
    accountOwner: Boolean(payload.associated_user?.account_owner),
  };
}
