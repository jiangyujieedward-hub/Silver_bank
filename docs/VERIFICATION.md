# Individual and Community Partner verification

## Free MVP operation

Minimum age starts at **14**. Platform administrators can change it and the organization re-review interval under Community administration → Verification administration. Shared email/password sign-in and saved recovery keys remain in use. The Supabase/phone-login migration is separate and is not completed by this release.

New registration starts with Individual / Community Member or NGO / Community Partner. The backend stores account type and does not accept role changes through profile forms. Organization accounts are separate entities with memberships; individual staff can join an existing organization with a private, email-bound invitation rather than registering another NGO.

## Individuals

1. Submit legal name and private date of birth. A date below the current age threshold is rejected. A claimed date alone does not verify age.
2. Contact verification staff to arrange an in-person check. Do not send ID images/numbers in chat.
3. An administrator starts review, checks the original identity against the person, checks birth date and eligibility, and investigates possible previous accounts.
4. The reviewer enters the issuer/scheme and stable identity identifier using the same normalization convention for every review. The server stores an HMAC fingerprint, never the raw identifier. It requires a private `VERIFICATION_HASH_KEY`; approval fails closed when missing. Preserve this key securely when migrating, otherwise fingerprints cannot be compared reliably.
5. An existing fingerprint sends the application to duplicate review and grants no second approval or starter credit. Applicant feedback never exposes the other account. Recovery uses the existing private recovery-key flow.
6. Approval requires all checks and an evidence/case reference. Starter credit is issued exactly once; previous grants and ledgers remain intact. Administrators cannot approve their own applications.

Manual verification is a human process, not automated document authentication or liveness detection. Matching fingerprints only detects the same identifier; reviewers must handle alternate documents, replaced documents and possible prior identities. No claim of universal one-person detection is made. No paid identity provider or SMS service is called.

## Organizations

Applications collect legal/public name, jurisdiction, entity type, identifier, registered address, website, contact details, mission and representative information. New accounts are pending and receive no personal starter credit.

Administrators configure jurisdiction-specific acceptable identifiers and evidence before approving organizations. Review uses original documents in person or an independently authorized secure channel. The app stores citations/case references, not document files. It does not fetch applicant-supplied URLs or authenticate arbitrary uploads.

Review separately establishes:

- Legal existence/current registration through authoritative official records or equivalent original documents.
- Representative authority, independently confirmed; a professional-looking email is insufficient.
- Actual program/activity evidence where the jurisdiction policy requires stronger checks.

States: Application incomplete → Submitted → Under review → Additional information required / Verified / Unable to verify. Applicants can correct and resubmit details, communicate with reviewers, and see feedback. Changing organization information resets checks and returns it to review. Failure wording does not accuse an applicant of fraud.

The Verified Community Partner badge is computed from server approval and an unexpired review date. Expiry immediately removes effective verified privileges without deleting history. Re-approval renews the date. Changing the configured interval affects subsequent approvals.

## Staff roles

- Owner: edit and resubmit the organization, invite staff, revoke staff access.
- Program Manager: program/insights eligibility after current organization verification.
- Training Manager: training eligibility after current verification.
- Community Staff: view their organization/status and communicate with review staff.

Invitations are private, account-email-bound, one-use and expire after seven days. Share them privately; no paid email delivery is configured. Owner self-removal is blocked. Membership is audited. Program/training eligibility is modeled, but program delivery, badge issuance, Community Time Funds and NGO-specific analytics are **not existing product modules** and are not implemented by this registration change. Pending organizations have no such endpoints or permissions.

## Security and rollout

Verification reads/writes require a session and ownership or platform-admin authorization. Private dates and evidence references are absent from public profile responses. Public badges are server-derived. Decisions, policy changes, invitations and membership removals are audited. No raw identity images are stored. Existing users are not silently marked verified, and all prior balances/history are retained.

Migration: `drizzle/0009_separate_verification.sql`. Back up existing databases before applying once. Configure a cryptographically random server-only `VERIFICATION_HASH_KEY`; never bundle it in web/mobile assets or commit it. A separate stable production secret is configured in Sites. Never replace it during routine redeployments.

Tests: `tests/verification.py` (isolated SQL invariants), `tests/verification-http.py` (isolated server at port 8789), existing credit/scheduling/inquiry/integrity checks, TypeScript and UI rendering checks. Do not run synthetic HTTP tests against real member data.

Reference practice: FATF recommends proportionate, risk-based nonprofit checks (https://www.fatf-gafi.org/en/topics/non-profit-organisations.html). This workflow is a manual product review process, not a certification of legal or regulatory compliance.

## Preserving the restored app

Verification lives under Profile → Verification and organization staff. Pending users retain the full navigation, task browsing, balances, existing task conversations, scheduling and completion. Only new requests and task acceptance require verified participation. Existing members are never silently labelled verified; their original starter grant is preserved and cannot be granted again.

Verified organization owners and program managers may create/accept tasks subject to the same balance rules. NGO accounts do not receive the personal starter grant. Existing audited administrator adjustments remain the only credit-issuance facility; this change does not create Community Time funds, training badges or program-management modules.

Manual review uses original evidence in person or an independently authorized secure channel. In-app review messages accept explanations and evidence references; uploading an identity document is neither required nor supported. Administrators must actually inspect the evidence before recording approval.
