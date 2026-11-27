# n8n-nodes-crossly

[![CI](https://github.com/crossly-dev/crossly-n8n/actions/workflows/ci.yml/badge.svg)](https://github.com/crossly-dev/crossly-n8n/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/n8n-nodes-crossly.svg)](https://www.npmjs.com/package/n8n-nodes-crossly)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[n8n](https://n8n.io) community nodes for [Crossly](https://crossly.net), the multi-marketplace crossposting platform for resellers. List once and sell on eBay, Poshmark, Mercari, Depop and more, then automate the rest in n8n:

- **Crossly** (action node): crosspost and edit listings, keep stock in sync, add tracking to orders, answer offers, pull sales.
- **Crossly Trigger**: start a workflow the moment Crossly sees a sale, an order, an offer, a price change or a stock change. The trigger registers its own webhook through the Crossly API (REST hooks) and removes it when the workflow is deactivated. Every delivery's `Crossly-Signature` is checked.

## Install

**n8n Cloud or self-hosted, from the UI:** *Settings → Community Nodes → Install*, enter `n8n-nodes-crossly`, tick the risk box, **Install**. (Once the package is verified by n8n it also shows up in the nodes panel search.)

**Self-hosted, manual:**

```bash
cd ~/.n8n/nodes            # create it if missing
npm install n8n-nodes-crossly
# restart n8n
```

**Docker:** add `npm install n8n-nodes-crossly` to a custom image under `/home/node/.n8n/nodes`, or install it from the UI with `N8N_COMMUNITY_PACKAGES_ENABLED=true`.

## Connect your account

1. In Crossly open **Settings → API & webhooks** and create a **personal access token** (`crossly_pat_…`). Give it the scopes your workflows need, e.g. `listings:read listings:write inventory:read inventory:write orders:read orders:write sales:read webhooks:read webhooks:write`.
2. In n8n create a **Crossly API** credential and paste the token. Leave **Base URL** as `https://crossly.net/api`.
3. Save. n8n tests it with `GET /v1/me`.

The token is sent as `Authorization: Bearer <token>` and is stored only in n8n's encrypted credentials store.

## Crossly node

Every endpoint comes from the public OpenAPI spec, [`https://crossly.net/openapi/seller.json`](https://crossly.net/openapi/seller.json). Request bodies the spec does not model are taken from the [API docs](https://crossly.net/docs).

| Resource | Operation | Method and path | operationId | Scope |
| --- | --- | --- | --- | --- |
| Account | Get | `GET /v1/me` | `getMe` | any |
| Inventory Item | Create | `POST /v1/inventory` | `createInventory` | `inventory:write` |
| Inventory Item | Get | `GET /v1/inventory/{id}` | `getInventory` | `inventory:read` |
| Inventory Item | Get Many | `GET /v1/inventory` | `listInventory` | `inventory:read` |
| Inventory Item | Set Stock | `POST /v1/inventory/bulk-quantity` | `createInventoryBulkQuantity` | `inventory:write` |
| Inventory Item | Update | `PATCH /v1/inventory/{id}` | `updateInventory` | `inventory:write` |
| Listing | Create (crosspost) | `POST /v1/listings` | `createListing` | `listings:write` |
| Listing | Delist | `DELETE /v1/listings/{id}` | `deleteListing` | `listings:write` |
| Listing | Get | `GET /v1/listings/{id}` | `getListing` | `listings:read` |
| Listing | Get Many | `GET /v1/listings` | `listListings` | `listings:read` |
| Listing | Update | `PATCH /v1/listings/{id}` | `updateListing` | `listings:write` |
| Offer | Get Many | `GET /v1/offers` | `getOffer` | |
| Offer | Respond | `POST /v1/offers/{id}/respond` | `createOfferRespond` | |
| Order | Add Tracking | `POST /v1/orders/{id}/tracking` | `createOrderTracking` | `orders:write` |
| Order | Get | `GET /v1/orders/{id}` | `getOrder` | `orders:read` |
| Order | Get Many | `GET /v1/orders` | `listOrders` | `orders:read` |
| Order | Update | `PATCH /v1/orders/{id}` | `updateOrder` | `orders:write` |
| Sale | Get Many | `GET /v1/sales` | `listSales` | `sales:read` |

Notes:

- **Get Many** pages with `page`/`limit` (100 per page) until a short page, because several Crossly lists omit totals. Filters map to the spec's query parameters (`platform`, `status`, `sku`, `tag`, `updatedSince`, `stillLive`, `platforms`, `platformMode`, `channel`).
- **Create** calls send an `Idempotency-Key`, so a retried request never makes two listings or items. Listing **Client Reference ID** (`clientReferenceId`) gives you idempotency across runs too.
- **Set Stock** sets the *available* quantity (`mode: set | increase | decrease`) for one or many items in a single write and pushes it to every live listing. Prefer it to per-item updates: writes are the scarce rate-limit bucket.
- **Offers** cover offers on Crossly marketplace listings (`GET /v1/offers`). Offers made on Poshmark, Mercari and the other marketplaces arrive through the **Offer Received** trigger.
- The node is marked `usableAsTool`, so an n8n AI Agent can call it.

### Rate limits and errors

Crossly counts requests per minute per token: reads 1,200/min, writes by plan (Free 15, Starter 60, Pro 240, Business 1,000, Scale 2,000). On `429` the node waits for `Retry-After` (up to 60 s) and retries up to three times. Other errors surface Crossly's `{ error: { code, message } }` and the `correlationId` support will ask for. See [Rate limits](https://crossly.net/docs/api-rate-limits) and [Errors](https://crossly.net/docs/api-errors).

## Crossly Trigger

The trigger subscribes with `POST /v1/webhooks` (`createWebhook`) when the workflow is activated (or when you click *Listen for test event*), checks it with `GET /v1/webhooks` (`listWebhooks`) and unsubscribes with `DELETE /v1/webhooks/{id}` (`deleteWebhook`). Crossly returns the signing secret once; the node keeps it in the workflow's static data and verifies `Crossly-Signature: t=<unix>,v1=<hex HMAC-SHA256 of "t.rawBody">` over the raw body with a 5-minute replay window. A failed check answers `401` and does not run the workflow.

Output is the Crossly envelope `{ id, type, created, data }` (or only `data` with *Output Data Only*). Deliveries are at least once, so dedupe on `id` when it matters.

| Event | Name | Fires when |
| --- | --- | --- |
| `sale.detected` | Sale Detected | A new sale was detected on any platform. |
| `order.created` | Order Created | An order was created from a sale. |
| `order.address_available` | Buyer Address Available | The buyer's shipping address arrived after the order was created. |
| `order.shipped` | Order Shipped | The order shipped: marked shipped, or the carrier's first in-network scan. |
| `order.delivered` | Order Delivered | The carrier reports the package delivered. |
| `order.cancelled` | Order Cancelled | An order was cancelled before it shipped. |
| `order.refunded` | Order Refunded | An order was refunded, in full or in part. |
| `refund.issued` | Refund Issued | A refund was issued on a platform. |
| `return.requested` | Return Requested | A Crossly-marketplace buyer asked to return an order. |
| `return.resolved` | Return Resolved | A return request closed. |
| `listing.created` | Listing Created | A listing was published on a platform (one event per marketplace). |
| `listing.price_changed` | Price Changed | A listing price changed, from any path. |
| `listing.delisted` | Listing Delisted | A platform listing came down. |
| `inventory.quantity_changed` | Stock Changed | An item's stock changed, from any path. |
| `offer.received` | Offer Received | A buyer made an offer. |
| `offer.accepted` | Offer Accepted | An offer was accepted, by you or an auto-respond rule. |
| `offer.declined` | Offer Declined | An offer was declined. |
| `offer.countered` | Offer Countered | An offer was countered. |
| `message.received` | Message Received | A buyer sent you a message. |
| `connection.disconnected` | Connection Lost | A platform session died; syncing for it stopped until you reconnect. |
| `automation.failed` | Automation Failed | An automation run failed. |

Payload shapes for every event: [Webhooks → Payloads](https://crossly.net/docs/api-webhooks#payloads). To try a workflow before a real sale, send a sample from the API: `POST /v1/webhooks/{id}/test` with `{ "event": "order.created" }`.

## Example workflows

- **Sale → Slack/Sheets:** Crossly Trigger (`sale.detected`) → Google Sheets *Append row* (`data.platform`, `data.salePrice`, `data.netProfit`).
- **Ship from your 3PL:** Crossly Trigger (`order.address_available`) → your fulfilment API → Crossly *Order → Add Tracking*.
- **Supplier stock sync:** Schedule → supplier feed → Crossly *Inventory Item → Get Many* (filter SKU) → *Set Stock*.
- **Offer alerts:** Crossly Trigger (`offer.received`) → Telegram/Discord message with `data.offerCents / 100`.

## Development

Built with [`@n8n/node-cli`](https://www.npmjs.com/package/@n8n/node-cli) in the [n8n-nodes-starter](https://github.com/n8n-io/n8n-nodes-starter) layout.

```bash
npm install
npm run dev     # n8n with the nodes hot-reloaded at http://localhost:5678
npm run lint
npm run build
npm test        # signature verification tests (after build)
```

CI (`.github/workflows/ci.yml`) runs lint, build, tests and `npm pack --dry-run` on every push and pull request.

## Releasing

1. Bump `version` in `package.json` and add a `CHANGELOG.md` entry.
2. Tag and push: `git tag v0.2.0 && git push origin v0.2.0`.
3. `.github/workflows/release.yml` lints, builds, tests and packs the tarball, attests it with `actions/attest-build-provenance`, and creates a GitHub Release with the tarball attached.
4. Publishing to npm runs only when the repository variable `PUBLISH_NPM` is `true`. It publishes the same attested tarball with `npm publish --provenance` from GitHub Actions, using npm trusted publishing (configure the `crossly-dev/crossly-n8n` repo + `release.yml` workflow + `npm` environment as a trusted publisher on npmjs.com) or an `NPM_TOKEN` secret.

Verify a release artifact: `gh attestation verify n8n-nodes-crossly-0.1.0.tgz -R crossly-dev/crossly-n8n`.

## n8n community node verification

To be listed as a **verified** node (installable on n8n Cloud and searchable in the nodes panel), n8n requires:

| Requirement | Status in this package |
| --- | --- |
| Package name starts with `n8n-nodes-` (or `@scope/n8n-nodes-`) | `n8n-nodes-crossly` |
| `n8n-community-node-package` keyword | yes |
| `n8n` block in `package.json` listing nodes and credentials | yes, with `"strict": true` |
| No runtime dependencies | none (`n8n-workflow` is a peer dependency, Node's `crypto` is built in) |
| Passes the n8n linter (`n8n-node lint`, strict ruleset) | enforced in CI |
| Credential has a test request and a documentation URL | `GET /v1/me`, API authentication docs |
| Published to npm from GitHub Actions **with provenance** | `release.yml`, `npm publish --provenance` |
| MIT license, English UI, README with usage and credentials docs | yes |
| Passes `npx @n8n/scan-community-package n8n-nodes-crossly` | run after the first npm publish |
| No access to the file system or environment variables, no telemetry | none used |

Then submit the package in the [n8n Creator Portal](https://creators.n8n.io) for review. See n8n's [verification guidelines](https://docs.n8n.io/integrations/creating-nodes/build/reference/verification-guidelines/) and [submit community nodes](https://docs.n8n.io/integrations/creating-nodes/deploy/submit-community-nodes/).

## Related

- [Crossly API docs](https://crossly.net/docs) · [OpenAPI spec](https://crossly.net/openapi/seller.json) · [Webhooks](https://crossly.net/docs/api-webhooks)
- [`@crossly/sdk`](https://github.com/crossly-dev/crossly-sdk) · [crossly-recipes](https://github.com/crossly-dev/crossly-recipes)

## License

[MIT](LICENSE)
