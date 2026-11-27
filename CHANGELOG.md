# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-11-27

### Added

- **Crossly API** credential: personal access token, tested with `GET /v1/me`.
- **Crossly** node with Account, Inventory Item, Listing, Offer, Order and Sale resources: crosspost, update and delist listings; create, update and restock inventory (`bulk-quantity`); get, update and add tracking to orders; list sales; list and respond to offers. Automatic pagination, `Retry-After` handling on 429, idempotency keys on creates, usable as an AI Agent tool.
- **Crossly Trigger** node for 21 webhook events (sales, orders, returns, listings, stock, offers, messages, connection and automation failures), subscribing through `POST /v1/webhooks` and verifying `Crossly-Signature` on every delivery.

[0.1.0]: https://github.com/crossly-dev/crossly-n8n/releases/tag/v0.1.0
