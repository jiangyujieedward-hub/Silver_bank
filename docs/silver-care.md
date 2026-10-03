# Silver Care

Silver Care runs at `#care/overview` inside Silver⁺. It uses the existing session, individual user identity, profile, recovery and logout. The landing page and Silver Bank provide entry points.

## Private data

The seven `care_*` tables are separate from public user profiles. Every application read/write checks the authenticated owner. Organization accounts cannot enter Care. Platform admin status grants no special Care access. Sharing creates a frozen snapshot of one saved summary for one existing individual recipient, with 1–30 day expiry and revocation. Updating the original summary does not silently change the shared snapshot. Export is a user-triggered text download; downloaded copies cannot be recalled. Access logs contain actions and IDs, not symptom text.

Privacy consent is required before storage. Bank recommendations read only explicitly enabled broad preferences, not records or measurements. AI chat sends only the current conversation to Groq after per-chat consent; saved health history and account details are not sent. New chats remain in the current session. With automatic saving enabled, validated quotations describing physical concerns become editable private health notes. Earlier saved chats remain in Settings. Groq may retain inputs/outputs for reliability or abuse monitoring according to its policy. Natural-language descriptions are preserved verbatim, supplemented by optional user-entered structured fields and can be edited after saving. Summaries concatenate only selected records/readings and remain editable. No diagnosis or clinical interpretation is generated.

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
Qwen `qwen/qwen3.8-27b` uses the existing server-only `GROQ_API_KEY`. No key or health conversation is logged. Authentication, individual account, Care setup and explicit consent are required. Atomic reservations in assistance_events cap combined Bank/Care usage at 20 attempted calls/day, Care users at 10/day, with a global 30-second interval. Context is bounded to 12 messages/6000 characters, structured response to 1100 tokens. No paid fallback, retries or billing changes. The account must remain on Groq Free; app caps cannot establish the provider billing tier. Provider failures are visible and manual records remain available. Model output is untrusted structured data. It cannot call tools or read history; the server validates quotations before saving permitted physical notes. Emergency guidance and no diagnosis/prescribing are enforced by the system prompt; model behavior still requires ongoing evaluation.

## Conversations, voice and family
Earlier chat history remains owner-scoped in `care_conversations` and can be read in Settings. New chats are session-only. Only the active conversation reaches Groq. Automatic physical notes are controlled by consent and an optional toggle; failed note saves are reported alongside the visible reply.

Voice uses feature-detected browser SpeechRecognition and speechSynthesis. Input requires explicit voice consent and the browser's microphone permission. The browser may process audio remotely; Silver Care never stores audio and saves only eligible physical quotations from new conversations. Recognition puts text into the composer for review before sending. Spoken responses use the selected voice language, with a stop control. Unsupported browsers retain text chat.

Family contacts contain name, optional relationship and international phone number. CRUD is owner-scoped, with version checks for edits. `tel:` links hand off to the device's calling app; no automatic calls, invitations, account links or health sharing occur. Full Care erasure also deletes chats and contacts.

Watch firmware integration instructions are in `public/guides/watch-connection.txt`. No Bluetooth protocol is assumed and no connected-watch claim is made without hardware testing.


## Voice-first update (October 2026)
The conversation page now prioritizes a large microphone with a text composer below. Full new chats are not stored; earlier saved chats remain accessible in Settings. Browser speech input requires permission and may use a browser speech service; spoken replies use speech synthesis. Transcripts remain editable before sending.

With the auto-save option enabled at consent, Groq returns a structured conversational reply plus a content category and exact quotations from the latest user message. Only explicit physical concerns are saved as symptom notes. Emotional-only, general, and uncertain conversations do not automatically create physical records. Mixed messages should extract only physical clauses. Quotes must be exact substrings; generated medical interpretations are rejected. Classification is probabilistic, not a diagnosis. Notes explicitly say they were AI-selected and not reviewed, and the timestamp is the conversation date. Existing My Health edit/delete controls apply. All record writes are owner-scoped and request-ID deduplicated. Saving failures are visible. No family or Bank sharing occurs automatically.
