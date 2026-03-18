---
name: shopify-marketplace-theme
description: Build, audit, and evolve Shopify themes that need to behave like service marketplaces instead of classic ecommerce stores. Use when working on Shopify theme architecture, homepage transformation, Dawn refactors, Liquid/JSON template changes, service-provider modeling, safe rollout planning, or local-to-preview publishing workflows for marketplace-style experiences.
---

# Shopify Marketplace Theme

Turn a Shopify theme into a service-marketplace experience with controlled, reviewable changes.

## Workflow

1. Audit the current theme before changing code.
2. Identify what is already custom versus what is still Dawn or classic ecommerce behavior.
3. Prefer the smallest visible change that moves the UX toward services, providers, and booking.
4. Reuse existing sections and snippets before creating new ones.
5. Keep every iteration reversible with a branch, a focused diff, and a commit.
6. Delay live-store connection, preview, or publishing until the local change is ready to validate.

## Core Priorities

- Treat the project as a platform in construction, not a generic store.
- Move the UX from `catalog + cart` toward `services + providers + request/reserve`.
- Keep the homepage, collection cards, and product template aligned with the marketplace narrative.
- Avoid breaking Dawn editor compatibility unless there is a strong reason.

## Working Rules

- Start in local files first.
- Prefer JSON template edits when the change is content/configuration only.
- Touch Liquid only when behavior or rendering must change.
- Do not remove existing logic unless the replacement is clear and justified.
- Keep changes small enough to review visually and revert quickly.

## File Focus

- Homepage: `templates/index.json`
- Product/service detail: `templates/product.json`, `sections/main-product.liquid`
- Collections/listings: `templates/collection*.json`, `sections/main-collection-product-grid.liquid`
- Reusable cards: `snippets/card-product.liquid`, `snippets/card-collection.liquid`
- Global store UX: `sections/header.liquid`, `sections/footer.liquid`
- Theme settings: `config/settings_data.json`, `config/settings_schema.json`

## Marketplace Checks

For each area, check:

- Does it still look like classic ecommerce?
- Does it explain services clearly?
- Does it represent providers or workshops meaningfully?
- Does it point users to reserve, request, compare, or contact?
- Can the change be previewed and rolled back safely?

## References

Read these project references as needed:

- `references/theme-audit.md` for audit workflow
- `references/ux-architecture.md` for marketplace UX direction
- `references/modeling.md` for service/provider modeling
- `references/rollout.md` for versioning and rollout rules

