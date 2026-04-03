import argparse
import json
import os
import sys
import urllib.parse
import urllib.request

DEFAULT_API_VERSION = os.getenv("SHOPIFY_API_VERSION", "2025-01")

FIELD_DEFINITIONS = [
    {"key": "provider_slug", "name": "Provider slug", "type": "single_line_text_field", "required": True},
    {"key": "display_name", "name": "Display name", "type": "single_line_text_field", "required": True},
    {"key": "legal_name", "name": "Legal name", "type": "single_line_text_field", "required": False},
    {"key": "catalog_vendor_name", "name": "Catalog vendor name", "type": "single_line_text_field", "required": False},
    {"key": "contact_name", "name": "Contact name", "type": "single_line_text_field", "required": True},
    {"key": "email", "name": "Email", "type": "single_line_text_field", "required": True},
    {"key": "phone", "name": "Phone", "type": "single_line_text_field", "required": False},
    {"key": "whatsapp", "name": "WhatsApp", "type": "single_line_text_field", "required": False},
    {"key": "address_line_1", "name": "Address line 1", "type": "single_line_text_field", "required": True},
    {"key": "address_line_2", "name": "Address line 2", "type": "single_line_text_field", "required": False},
    {"key": "city", "name": "City", "type": "single_line_text_field", "required": True},
    {"key": "postal_code", "name": "Postal code", "type": "single_line_text_field", "required": True},
    {"key": "province_or_region", "name": "Province or region", "type": "single_line_text_field", "required": False},
    {"key": "country", "name": "Country", "type": "single_line_text_field", "required": True},
    {"key": "latitude", "name": "Latitude", "type": "number_decimal", "required": False},
    {"key": "longitude", "name": "Longitude", "type": "number_decimal", "required": False},
    {"key": "google_place_id", "name": "Google Place ID", "type": "single_line_text_field", "required": False},
    {"key": "service_categories", "name": "Service categories", "type": "list.single_line_text_field", "required": False},
    {"key": "description", "name": "Description", "type": "multi_line_text_field", "required": False},
    {"key": "opening_hours", "name": "Opening hours", "type": "multi_line_text_field", "required": False},
    {"key": "logo", "name": "Logo", "type": "file_reference", "required": False},
    {"key": "gallery", "name": "Gallery", "type": "list.file_reference", "required": False},
    {"key": "logo_source_url", "name": "Logo source URL", "type": "url", "required": False},
    {"key": "gallery_source_urls", "name": "Gallery source URLs", "type": "multi_line_text_field", "required": False},
    {"key": "website_url", "name": "Website URL", "type": "url", "required": False},
    {"key": "instagram_url", "name": "Instagram URL", "type": "url", "required": False},
    {"key": "status", "name": "Status", "type": "single_line_text_field", "required": True},
    {"key": "source_submission_id", "name": "Source submission ID", "type": "single_line_text_field", "required": True},
]


def load_submission(path):
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def build_address(submission):
    parts = [
        submission.get("address_line_1", ""),
        submission.get("address_line_2", ""),
        submission.get("postal_code", ""),
        submission.get("city", ""),
        submission.get("province_or_region", ""),
        submission.get("country", ""),
    ]
    return ", ".join([part.strip() for part in parts if part and part.strip()])


def geocode_address(address, api_key):
    query = urllib.parse.urlencode({"address": address, "key": api_key})
    url = f"https://maps.googleapis.com/maps/api/geocode/json?{query}"
    with urllib.request.urlopen(url) as response:
        payload = json.loads(response.read().decode("utf-8"))

    if payload.get("status") != "OK" or not payload.get("results"):
        raise RuntimeError(f"Google geocoding failed for '{address}' with status {payload.get('status')}")

    result = payload["results"][0]
    location = result["geometry"]["location"]
    return {
        "latitude": location["lat"],
        "longitude": location["lng"],
        "google_place_id": result.get("place_id", ""),
        "formatted_address": result.get("formatted_address", address),
    }


def definition_payload():
    return {
        "definition": {
            "type": "provider_profile",
            "name": "Provider Profile",
            "fieldDefinitions": FIELD_DEFINITIONS,
        }
    }


def metaobject_payload(submission, geocoded):
    approved = dict(submission)
    approved["status"] = "approved"
    approved["latitude"] = geocoded["latitude"]
    approved["longitude"] = geocoded["longitude"]
    approved["google_place_id"] = geocoded["google_place_id"]

    fields = []
    mappings = {
        "provider_slug": approved.get("provider_slug", ""),
        "display_name": approved.get("display_name", ""),
        "legal_name": approved.get("legal_name", ""),
        "catalog_vendor_name": approved.get("catalog_vendor_name", "") or approved.get("display_name", ""),
        "contact_name": approved.get("contact_name", ""),
        "email": approved.get("email", ""),
        "phone": approved.get("phone", ""),
        "whatsapp": approved.get("whatsapp", ""),
        "address_line_1": approved.get("address_line_1", ""),
        "address_line_2": approved.get("address_line_2", ""),
        "city": approved.get("city", ""),
        "postal_code": approved.get("postal_code", ""),
        "province_or_region": approved.get("province_or_region", ""),
        "country": approved.get("country", ""),
        "latitude": str(approved.get("latitude", "")),
        "longitude": str(approved.get("longitude", "")),
        "google_place_id": approved.get("google_place_id", ""),
        "description": approved.get("description", ""),
        "opening_hours": approved.get("opening_hours", ""),
        "logo_source_url": approved.get("logo_source_url", ""),
        "gallery_source_urls": approved.get("gallery_source_urls", ""),
        "website_url": approved.get("website_url", ""),
        "instagram_url": approved.get("instagram_url", ""),
        "status": approved.get("status", "approved"),
        "source_submission_id": approved.get("submission_id", ""),
    }

    for key, value in mappings.items():
        if value != "":
            fields.append({"key": key, "value": value})

    categories = approved.get("service_categories", [])
    if categories:
        fields.append({"key": "service_categories", "value": json.dumps(categories)})

    return {
        "metaobject": {
            "type": "provider_profile",
            "handle": approved["provider_slug"],
            "fields": fields,
        }
    }


def post_graphql(store, token, query, variables):
    endpoint = f"https://{store}/admin/api/{DEFAULT_API_VERSION}/graphql.json"
    payload = json.dumps({"query": query, "variables": variables}).encode("utf-8")
    request = urllib.request.Request(
        endpoint,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": token,
        },
        method="POST",
    )
    with urllib.request.urlopen(request) as response:
        return json.loads(response.read().decode("utf-8"))


def command_definition(args):
    payload = definition_payload()
    if not args.execute:
        print(json.dumps(payload, indent=2, ensure_ascii=False))
        return

    store = os.getenv("SHOPIFY_STORE")
    token = os.getenv("SHOPIFY_ADMIN_TOKEN")
    if not store or not token:
        raise RuntimeError("Define SHOPIFY_STORE y SHOPIFY_ADMIN_TOKEN para ejecutar la mutación.")

    query = """
    mutation CreateProviderProfileDefinition($definition: MetaobjectDefinitionCreateInput!) {
      metaobjectDefinitionCreate(definition: $definition) {
        metaobjectDefinition { id name type }
        userErrors { field message code }
      }
    }
    """
    print(json.dumps(post_graphql(store, token, query, payload), indent=2, ensure_ascii=False))


def command_approve(args):
    submission = load_submission(args.input)
    api_key = os.getenv("GOOGLE_MAPS_API_KEY")
    if not api_key:
        raise RuntimeError("Define GOOGLE_MAPS_API_KEY para geocodificar la dirección aprobada.")

    geocoded = geocode_address(build_address(submission), api_key)
    payload = metaobject_payload(submission, geocoded)

    if not args.execute:
        print(json.dumps({"geocoded": geocoded, "payload": payload}, indent=2, ensure_ascii=False))
        return

    store = os.getenv("SHOPIFY_STORE")
    token = os.getenv("SHOPIFY_ADMIN_TOKEN")
    if not store or not token:
        raise RuntimeError("Define SHOPIFY_STORE y SHOPIFY_ADMIN_TOKEN para ejecutar la mutación.")

    query = """
    mutation CreateProviderProfile($metaobject: MetaobjectCreateInput!) {
      metaobjectCreate(metaobject: $metaobject) {
        metaobject { id handle type }
        userErrors { field message code }
      }
    }
    """
    print(json.dumps(post_graphql(store, token, query, payload), indent=2, ensure_ascii=False))


def main():
    parser = argparse.ArgumentParser(description="Provider approval workflow helper for Shopify + Google Maps.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    definition_parser = subparsers.add_parser("definition", help="Print or create the provider_profile metaobject definition.")
    definition_parser.add_argument("--execute", action="store_true", help="Create the definition in Shopify.")
    definition_parser.set_defaults(func=command_definition)

    approve_parser = subparsers.add_parser("approve", help="Geocode an approved submission and print or create the provider metaobject.")
    approve_parser.add_argument("--input", required=True, help="Path to approved provider submission JSON.")
    approve_parser.add_argument("--execute", action="store_true", help="Create the approved provider metaobject in Shopify.")
    approve_parser.set_defaults(func=command_approve)

    args = parser.parse_args()
    try:
        args.func(args)
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
