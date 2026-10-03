# Silver Care

Silver Care runs at `#care/overview` inside Silver⁺. It uses the existing session, individual user identity, profile, recovery and logout. The landing page and Silver Bank provide entry points.

## Private data

The seven `care_*` tables are separate from public user profiles. Every application read/write checks the authenticated owner. Organization accounts cannot enter Care. Platform admin status grants no special Care access. Sharing creates a frozen snapshot of one saved summary for one existing individual recipient, with 1–30 day expiry and revocation. Updating the original summary does not silently change the shared snapshot. Export is a user-triggered text download; downloaded copies cannot be recalled. Access logs contain actions and IDs, not symptom text.

Privacy consent is required before storage. Bank recommendations read only explicitly enabled broad preferences, not records or measurements. AI chat sends only the current conversation to Groq after per-chat consent; saved health history and account details are not sent. With consent, completed chat turns are saved to the user’s private conversation history. Only the conversation currently opened is sent when continuing a chat. The user can review their own words as an editable record and confirm before saving. Groq may retain inputs/outputs for reliability or abuse monitoring according to its policy. Natural-language descriptions are preserved verbatim, supplemented by optional user-entered structured fields and reviewed before saving. Summaries concatenate only selected records/readings and remain editable. No diagnosis or clinical interpretation is generated.

## Device adapter contract

No commercial watch provider is configured. My Watch creates a scoped write-only connection key for a trusted adapter; it remains awaiting first sync until real readings arrive. The UI never populates measurements with example data.

POST `/api/care-device` with `Content-Type: application/json` and `Authorization: CareDevice <key>`.

Body: `measurements`, an array of 1–100 objects. Each object has `id` (source event ID), `kind`, `value` (non-negative number), `unit`, and `measuredAt` (ISO timestamp or Unix seconds). Supported kind/unit pairs are heart_rate/bpm, steps/steps, activity_minutes/minutes. The user must grant each category. IDs are unique per connection for retry deduplication. This is ingestion validation, not medical assessment. Keys are stored as SHA-256 hashes. Changing permissions rotates the key; disconnecting revokes it. Revocation is checked again at insert time.

Real watch pairing, vendor OAuth and an actual hardware adapter still require the chosen device’s API and implementation. Never describe endpoint setup alone as a paired device. OS keyboard dictation is available where the user's device supports it; the app does not send audio to a speech service.

## Reminders and limits

Save confirmations and reminders are in-app, configurable by the owner. Calendar export creates optional appointment alerts or a daily check-in event; background alerts depend on importing the file into a calendar. No browser push or SMS service is configured. The UI labels the latest 500 records/readings and latest 100 summaries as recent information.

## Validation

`tests/care-http.py` operates only against disposable synthetic accounts at localhost:8789. It covers anonymous/NGO denial, cross-user and admin isolation, review gating, optimistic edit conflicts, summary snapshot sharing/revocation, write-only device ingestion/permissions/deduplication, preference consent, public-profile isolation and Care-only deletion. Initialize the isolated test state with the existing partner test fixture before running. Never seed production.

## AI chat
Qwen `qwen/qwen3.8-27b` uses the existing server-only `GROQ_API_KEY`. No key or health conversation is logged. Authentication, individual account, Care setup and explicit consent are required. Atomic reservations in assistance_events cap combined Bank/Care usage at 20 attempted calls/day, Care users at 10/day, with a global 30-second interval. Context is bounded to 12 messages/6000 characters, response to 450 tokens. No paid fallback, retries or billing changes. The account must remain on Groq Free; app caps cannot establish the provider billing tier. Provider failures are visible and manual records remain available. Model output is untrusted plain text and cannot call tools, read history or save records. Emergency guidance and no diagnosis/prescribing are enforced by the system prompt; model behavior still requires ongoing evaluation.

## Conversations, voice and family
Chat history is stored in owner-scoped `care_conversations` after explicit AI/storage consent. Users can reopen or delete conversations; a maximum of 100 chats is retained per account. Optimistic versions prevent silent overwrites across tabs. Only the active conversation reaches Groq. Health notes remain a separate reviewed action. Failed saves retain the visible reply and offer retry.

Voice uses feature-detected browser SpeechRecognition and speechSynthesis. Input requires explicit voice consent and the browser's microphone permission. The browser may process audio remotely; Silver Care stores transcripts, never audio. Recognition puts text into the composer for review before sending. Spoken responses use the selected voice language, with a stop control. Unsupported browsers retain text chat.

Family contacts contain name, optional relationship and international phone number. CRUD is owner-scoped, with version checks for edits. `tel:` links hand off to the device's calling app; no automatic calls, invitations, account links or health sharing occur. Full Care erasure also deletes chats and contacts.

Watch firmware integration instructions are in `public/guides/watch-connection.txt`. No Bluetooth protocol is assumed and no connected-watch claim is made without hardware testing.
