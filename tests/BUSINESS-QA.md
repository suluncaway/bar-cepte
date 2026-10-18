# Bar Cepte İşletme v1

Separate entry: `business.html`. Personal inventory, preferences, history and backup keys are never read by the business client. Business sign-in uses the existing Google verification service with a separate session-storage key.

One owner business, one stockroom, up to 30 members. Owner: products, recipe revisions, receipts, supplier returns, reversals, invitations and access revocation. Staff: sales, complimentary drinks, waste and physical counts. The server enforces permissions inside the same transaction as stock changes. Invites are hashed, single-use and expire in 24 hours.

Products use ml/g/pieces, configurable bottle/pack size, case count and reorder threshold. Recipes describe one serving in base units. Sales and complimentary drinks consume all recipe ingredients atomically. Waste and supplier returns reduce physical stock. Counts store expected, observed and difference. Reversals link to original immutable event lines, including after a product or recipe has been edited. Prepared-drink returns must be recorded as waste, not reversed into recovered ingredients.

PostgreSQL tables `barcepte_businesses` and `barcepte_business_events` are created in the existing transactional schema initialization. Stock and audit writes share a row lock and transaction. Events have unique business/event IDs and sequence numbers; retries are idempotent, stale revisions require refresh and no operation may produce negative stock. The development file store serializes all business writes. Application APIs expose no event deletion or replacement operation.

All events are retained; the API pages 100 at a time. Owner JSON export retrieves all pages and the current business state. This is an export, not an import or accounting/fiscal integration. POS integration, payments, automatic supplier orders, multiple warehouses/branches and profitability reports are outside v1.

Manual browser QA: mobile 360/390 px, tablet 768 px and desktop 1440 px; sample bar; 1 case of 12×700 ml; 8 Negroni sales; count difference; linked reversal; insufficient-stock rejection; long product names; editable three-ingredient recipe; staff role; Turkish/English. Demo data is in memory only and never calls business mutation APIs. Production Google login/invitations require the actual account holder; automated service tests cover verified membership and permission boundaries. PostgreSQL concurrency tests run in GitHub CI with a disposable test database.
