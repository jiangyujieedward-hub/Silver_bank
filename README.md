# Silver Bank

A mobile-first, persistent community Time Bank. React/Vinext frontend; Cloudflare Worker API; D1 SQLite database with atomic triggers, durable sessions, ledger and audit records. No product seed users or task data.

## First use

Open the deployed application. The first administrator uses the one-time `ADMIN_SETUP_KEY` configured as a hosted secret, enters their own details, and chooses introductory credit in whole minutes. Registration remains closed until that step completes. Save the recovery key displayed after account creation. Later accounts join through Create account. Email is an account identifier; email delivery/verification is not configured. Password recovery uses the saved private recovery key, rotates that key and revokes earlier sessions.

## Core rules

- Authoritative amounts are integer seconds. All tasks have the same time rate, with no cash conversion.
- Posting reserves estimated time atomically. Available balance is ledger total less held time. Reservation does not pay a helper.
- Only another member can accept an open task; a conditional database update prevents simultaneous claims.
- Both people confirm readiness. The second confirmation records the database start timestamp.
- Either participant finishes; actual time is the server finish minus start, with a minimum one second. The other participant confirms settlement.
- Actual duration can exceed the estimate. Members may post requests and settle with a zero or negative balance. Posting subtracts the estimate from available time; completion replaces that reservation with the actual service debit. Negative balances represent time to contribute back.
- Completion releases the reservation and transfers equal time in the same SQLite statement transaction. A unique task/type index and final-state guard prevent duplicate settlement.
- Disputes freeze the task without paying. Administrators can cancel/release or settle an already finished disputed task. Every administrative action needs an audit reason. Adjustments append ledger records; no balance overwrites.
- Reviews are one per participant per completed task. Task messages are participant-only. Suspensions revoke sessions and block sign-in.

## Security and persistence

Passwords use salted PBKDF2-SHA256 (100,000 iterations, Worker WebCrypto limit). Session and recovery tokens have 256 bits of entropy; only token hashes are stored. Web sessions use Secure, HttpOnly, SameSite cookies and expire after seven days. Native tokens use iOS Keychain and Android Keystore-backed encrypted storage. Web mutations require same-origin JSON. Native apps use bearer sessions with explicit native request headers; CORS permits only configured Capacitor origins. Authentication attempts are rate-limited in D1. Authorization is checked by the backend on each protected request. Frontend balance, user IDs, and duration claims cannot determine settlement.

Ledger and administrator-audit history are immutable through database triggers. Source and destination foreign keys, review uniqueness, task-state triggers and exact integer-time settlement protect consistency. Database migrations are schema-only. Starter credit and categories are inserted by authorized setup, not a hardcoded user seed.

Profile images are constrained to small PNG/JPEG/WebP data URLs (up to 1 MB image input) and stored persistently in D1. General service area is public to signed-in members; precise addresses should be shared only in private task messages. Updates refresh periodically; ledger history supports loading older records.

## Local development

Node >=22.13 is required. `npm ci`, then `npm run build`. Put a generated `ADMIN_SETUP_KEY` in ignored `.dev.vars`. Apply each migration once:

```
node --import ./scripts/sites-env.mjs node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_sticky_ken_ellis.sql
npm run dev
```

Production source is built and deployed through Sites, with D1 migrations applied before the Worker deploys. `.dev.vars`, `.wrangler`, and all test database records are excluded from source publication. `.env.example` documents the hosted secret key.

## Verification

`tests/workflow.py` runs real HTTP requests against a fresh isolated local Worker at port 8787 and `.wrangler/test-state`. It creates independent temporary test accounts, tests concurrent acceptance and posting, two-person start and completion, duplicate settlement, ledger conservation, private messages, reviews, notifications, sign-out/sign-in persistence, recovery, suspension, and administrator adjustments. Never run it against production. Initialize the isolated database with the migration before each complete test run.

`tests/integrity.py` validates SQL-level negative-balance settlement, immutable ledger/audit, duplicate onboarding and settlement constraints, and invalid task transitions. These tests are independent of product data.

## Operational scope

This release implements Time Bank only. Community moderation is performed in the administrator screen. Recovery keys must be saved by members; there is no email-reset delivery or verified-email claim. Introductory credit can be set to zero to avoid unrestricted issuance. The platform does not claim to verify real-world service delivery or unique human identity. Set community policies before inviting members.

## Registration and agreements

Registration stores service area, private phone number, preferred language (Traditional Chinese, English, German, French, Japanese), and private age range. The interface changes immediately between all five supported languages; the chosen language is persisted in the account when saved. Original user-written content and the supplied English agreements retain their original wording. Existing members must complete these fields and sign current agreements before further task participation.

Both agreements from the supplied 15 September 2026 PDF are stored with content-derived versions. Account and historical per-task acceptance records retain the member, name, handwritten numeric strokes, document version and server timestamp; database triggers prohibit edits and deletion. Account-level agreements cover participation. Each participant confirms readiness before starting, without signing again. The original PDF and versioned JSON remain available under public/guidelines. References to unsupported health, watch or calling functions do not add those functions to the app.

## Installed mobile apps

The `mobile` entry bundles the same frontend into Capacitor iOS and Android applications. Assets ship inside the app; the shared HTTPS service provides accounts and persistent data. Internet access is required. There is no remote `server.url` wrapper or browser-only local account store.

Build with `npm run mobile:build` and `npm run mobile:sync`. Open `ios/App/App.xcodeproj` in Xcode (Swift Package Manager), or open `android` in Android Studio. iOS device installation and TestFlight distribution require the owner's Apple signing team. Android debug builds are for direct testing; store distribution requires an owner-controlled release signing key and store account. Do not publish debug signing keys as release credentials.

Native integration tests in `tests/mobile_auth.py` verify bearer authentication, revocation, consent rejection and saved profile edits against the isolated local server. `tests/workflow.py` covers negative reservations and actual settlement using independent accounts; `tests/integrity.py` checks immutable ledgers and consent, uniqueness, state transitions and settlement conservation.

## Language, phone and handwritten signatures (1.1)

Phone input separates the international calling code and national number. libphonenumber-js supplies calling-code metadata and validates possible numbers; the backend stores a normalized international number. Existing phone records are split when editing.

All five interface languages have explicit catalogues; dates and time units use the selected locale. No DOM text replacement or external translation service is used. Member names, task descriptions, private messages and original agreements are not machine-translated. Language changes preserve form values and the drawing. Save profile persists the language to the account; device-local language is also remembered before login.

New agreement acceptances require a blank-start handwritten signature pad and name. The backend validates bounded numeric strokes and stores them in the immutable agreement record. Original typed-only acceptances remain intact; there is no invented handwriting for earlier records. Members can inspect their own signed agreements on Profile. Blank, malformed and oversized drawings are rejected. Keyboard drawing is supported for accessibility.

Tests: `node scripts/test-interface.mjs` renders all five languages and checks stable form field names, phone parsing, no prefilled signatures and drawing validation. Existing HTTP tests also check saved drawings, changed calling codes and rejection of administrator access for ordinary members, including a forged role on registration.

## Task start and photo messages (1.2)

Starting a task only confirms readiness. Both participants must still be ready before the authoritative start timestamp is recorded. Account agreements remain required; previous signatures are preserved and no new task signature is requested.

Private task messages support optional JPEG, PNG or WebP photos, with or without text. The client resizes and re-encodes uploads to JPEG (removing original metadata), and the backend checks size, MIME and file signatures. Each stored image is limited to 600 KB. Photo data is stored with the private D1 message record, with no public image URL. Message reads and writes require task participation, including paginated reads; administrator status alone does not grant chat access. The latest ten messages load first, with older pages available to bound response size. Existing text messages remain unchanged.

## iOS simulator secure-storage correction

Simulator builds must retain Xcode's simulator entitlements. The iOS project now applies `App/Simulator.entitlements` only to the simulator SDK, providing an application identifier and private Keychain access group. Build with code signing enabled (ad-hoc signing is sufficient for the simulator); do not use `CODE_SIGNING_ALLOWED=NO`. Real-device builds continue to use the Apple team's normal signing settings.

On an Apple Silicon Mac with a booted iOS 18 simulator, `bash scripts/test-ios-keychain.sh` checks empty lookup, creation, reading, updating and deletion using disposable records, without reading member credentials. The original unsigned configuration returned -34018 (missing entitlement); the corrected configuration supports these operations.

## Community support (1.4)

Optional request drafting and category suggestions use Groq `qwen/qwen3.8-27b`. Configure `GROQ_API_KEY` as a server secret, never in a mobile bundle. The member must opt in before their description is sent; only their entered text, active category names/IDs, chosen timezone and current timestamp leave the service. Suggestions populate editable fields and never post or alter balances. Missing or low-confidence fields remain blank. Provider failures return to the ordinary form.

Keep the Groq organization on its **Free plan**. Code cannot determine or enforce the provider's billing plan. There is no paid-provider fallback, automatic plan upgrade, retry loop or paid built-in tool. Atomic call reservations limit the whole community to an administrator-configurable maximum of 20 attempts per UTC day, at most 5 per member, with 30 seconds between global attempts. Output is capped at 900 tokens. Attempts, outcomes, model and token usage are recorded without prompt content. Free allowance may also be shared with other apps. Admin > Community insights allows disabling processing and reducing limits to zero.

Recommendations use deterministic rules over existing service area, skills, category preferences, completed helping history and private optional weekday/meeting/duration preferences. They are suggestions, not guarantees of availability or exact distance; all tasks remain browsable. No scores or location coordinates are sent to an external model.

Community insights use real database aggregates. Category counts cover requests created in the last 30 days; daily completion/contribution covers tasks confirmed in that period; area and stale queues describe currently open requests. Counts of recent helpers are not a measure of current available helpers. Review flags identify repeated exchanges, unusually short completions, multiple disputes and repeated titles; they do not prove misconduct. A human must review linked task records, record a reason and apply any separate authorized action. No automatic penalties or ledger changes occur.

Dispute summaries show stored timestamps, status history, ledger entries, reported concerns and recent participant statements. They are structured record summaries, not an external language-model judgment. Only administrators may access them; each access is audited. This narrowly scoped dispute-review endpoint can show the latest 100 text statements, while ordinary message endpoints remain participant-only. Photos are not copied into the summary. Earlier task history was not invented or backfilled. Status history is append-only from this update onward.

`tests/community.py` first runs the original workflow on a fresh isolated local service, then tests matching preferences, privacy, recommendation eligibility, admin flags/reviews, dispute records and disabled-provider fallback. `TEST_GROQ=1` additionally requires a real synthetic Groq draft to succeed; that check can fail if the provider rejects the local Workers runtime even when the same key succeeds through a direct client. Never run these fixtures against production.

## Clean interface (1.5)

The supplied Google Sans variable fonts are bundled locally as WOFF2 with their OFL license. System fonts cover scripts absent from the supplied font. Home shows the signed-in member's service area, greeting, ledger-derived balance and the latest in-person requests matching that area. Search filters these retrieved requests; View all opens task discovery. Category icons are interface symbols, not photos of a particular member's service. Recommendations remain available as a Tasks tab. Member-authored descriptions remain in task details. Promotional captions, repeated headings and the footer have been removed. The shared interface is used by web, Android and iOS.
# Current local review changes

- Community selection uses country → region → city choices in registration, profiles, requests and filters. The backend validates the canonical selection; existing stored locations remain readable. Where the reference dataset has no subdivisions below a region, the region is the community. Regenerate reference data with `node scripts/build-communities.mjs` after changing its locked dependency.
- Request posting is now limited to available credit; reservations and transfers are guarded atomically in the database. Starter credit is issued once, with no automatic refill. Migration `0006_credit_limit.sql` enables the rule without rewriting history.
- Available task cards use the React Bits JS-CSS CircularGallery implementation, adapted for real task content. List view is available, and reduced-motion preferences automatically use the list.
- Local development detects the Mac's configured HTTPS proxy (or `HTTPS_PROXY`) for Groq. A randomly authenticated, loopback-only transport keeps provider credentials server-side and preserves the API's consent and usage checks. Production builds do not contain this development transport configuration. Groq remains the only provider; no paid fallback is configured.
- Verified the AI form with a synthetic description, interface rendering in five languages, and HTTP registration/profile persistence/task settlement against a separate test database. This review has not been published.

## Preview and Sites publishing

Run `npm run dev` for development. Run `npm run build` then `npm start` for a production-build preview at http://localhost:5173. `PORT` and `HOST` may override the preview address; `npm start` builds automatically if the production output is missing.

Run `npm run sites:package` to build and create `.sites-runtime/silver-bank-deploy.tar.gz`. This project-local script replaces dependence on an absent plugin packaging script. Publish the exact committed source to the existing Sites source repository, save a Sites version using that commit and archive, then deploy that saved version. Local secrets, databases and account records are excluded from the archive.

## Individual and NGO verification

Separate registration paths and free manual verification are described in [Verification operations](docs/VERIFICATION.md). Existing navigation, histories and active tasks remain available while new participation requires approval.
