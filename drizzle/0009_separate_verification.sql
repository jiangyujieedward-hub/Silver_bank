ALTER TABLE users ADD COLUMN account_type TEXT NOT NULL DEFAULT 'individual' CHECK(account_type IN ('individual','organization'));
--> statement-breakpoint
CREATE TABLE identity_verifications (
 user_id TEXT PRIMARY KEY REFERENCES users(id), legal_name TEXT NOT NULL DEFAULT '', birth_date TEXT,
 status TEXT NOT NULL DEFAULT 'incomplete' CHECK(status IN ('incomplete','submitted','under_review','additional_information','verified','unable_to_verify')),
 age_eligible INTEGER NOT NULL DEFAULT 0 CHECK(age_eligible IN (0,1)), identity_key TEXT,
 duplicate_status TEXT NOT NULL DEFAULT 'pending' CHECK(duplicate_status IN ('pending','clear','review')),
 method TEXT, evidence_reference TEXT, reviewer_id TEXT REFERENCES users(id), verified_at INTEGER,
 feedback TEXT NOT NULL DEFAULT '', version INTEGER NOT NULL DEFAULT 0
);
--> statement-breakpoint
CREATE UNIQUE INDEX identity_verifications_identity_key_unique ON identity_verifications(identity_key);
--> statement-breakpoint
CREATE TABLE organizations (
 id TEXT PRIMARY KEY, legal_name TEXT NOT NULL, public_name TEXT NOT NULL DEFAULT '', jurisdiction TEXT NOT NULL,
 entity_type TEXT NOT NULL, registration_id TEXT NOT NULL, registered_address TEXT NOT NULL, website TEXT NOT NULL DEFAULT '',
 contact_email TEXT NOT NULL, contact_phone TEXT NOT NULL, mission TEXT NOT NULL,
 representative_name TEXT NOT NULL, representative_role TEXT NOT NULL, representative_email TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'submitted' CHECK(status IN ('incomplete','submitted','under_review','additional_information','verified','unable_to_verify')),
 registry_checked INTEGER NOT NULL DEFAULT 0, representative_checked INTEGER NOT NULL DEFAULT 0, activity_checked INTEGER NOT NULL DEFAULT 0,
 evidence_reference TEXT NOT NULL DEFAULT '', feedback TEXT NOT NULL DEFAULT '', reviewer_id TEXT REFERENCES users(id),
 verified_at INTEGER, review_due INTEGER, version INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE TABLE organization_members (
 id TEXT PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id), user_id TEXT NOT NULL REFERENCES users(id),
 role TEXT NOT NULL CHECK(role IN ('owner','program_manager','training_manager','staff')), active INTEGER NOT NULL DEFAULT 1
);
--> statement-breakpoint
CREATE UNIQUE INDEX organization_identity ON organizations(jurisdiction,registration_id);
--> statement-breakpoint
CREATE UNIQUE INDEX organization_member_once ON organization_members(organization_id,user_id);
--> statement-breakpoint
CREATE INDEX organization_member_user ON organization_members(user_id,active);
--> statement-breakpoint
CREATE TABLE organization_invites (
 id TEXT PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES organizations(id), email TEXT NOT NULL,
 role TEXT NOT NULL CHECK(role IN ('program_manager','training_manager','staff')), expires INTEGER NOT NULL,
 invited_by TEXT NOT NULL REFERENCES users(id), accepted_by TEXT REFERENCES users(id)
);
--> statement-breakpoint
CREATE TABLE verification_messages (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), organization_id TEXT REFERENCES organizations(id),
 sender_id TEXT NOT NULL REFERENCES users(id), content TEXT NOT NULL, created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE INDEX verification_message_user ON verification_messages(user_id,created_at);
--> statement-breakpoint
CREATE INDEX verification_message_org ON verification_messages(organization_id,created_at);
--> statement-breakpoint
CREATE TABLE verification_policies (
 jurisdiction TEXT PRIMARY KEY, identifier_label TEXT NOT NULL, documents TEXT NOT NULL, activity_required INTEGER NOT NULL DEFAULT 0
);
--> statement-breakpoint
DROP TRIGGER onboard;
--> statement-breakpoint
CREATE TRIGGER verified_starter AFTER UPDATE OF status ON identity_verifications
 WHEN NEW.status='verified' AND OLD.status<>'verified' AND NEW.age_eligible=1 AND NEW.duplicate_status='clear'
 AND (SELECT account_type FROM users WHERE id=NEW.user_id)='individual'
 AND CAST((SELECT value FROM settings WHERE id='onboarding_seconds') AS INTEGER)>0
 AND NOT EXISTS(SELECT 1 FROM ledger WHERE destination_id=NEW.user_id AND type='onboarding')
 BEGIN INSERT INTO ledger(id,destination_id,amount,type,metadata) VALUES(lower(hex(randomblob(16))),NEW.user_id,CAST((SELECT value FROM settings WHERE id='onboarding_seconds') AS INTEGER),'onboarding','One-time credit after manual identity verification'); END;
--> statement-breakpoint
CREATE TRIGGER verification_approval_guard BEFORE UPDATE ON identity_verifications
 WHEN NEW.status='verified'
 BEGIN SELECT RAISE(ABORT,'verification_checks_required') WHERE NEW.age_eligible<>1 OR NEW.duplicate_status<>'clear' OR NEW.identity_key IS NULL OR NEW.reviewer_id IS NULL OR NEW.reviewer_id=NEW.user_id OR NEW.verified_at IS NULL OR NEW.birth_date IS NULL OR NEW.evidence_reference IS NULL;
 SELECT RAISE(ABORT,'reviewer_required') WHERE NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.reviewer_id AND role='admin' AND suspended=0); END;
--> statement-breakpoint
CREATE TRIGGER organization_approval_guard BEFORE UPDATE ON organizations WHEN NEW.status='verified'
 BEGIN SELECT RAISE(ABORT,'organization_checks_required') WHERE NEW.registry_checked<>1 OR NEW.representative_checked<>1 OR NEW.reviewer_id IS NULL OR NEW.review_due IS NULL OR NEW.verified_at IS NULL OR length(NEW.evidence_reference)=0;
 SELECT RAISE(ABORT,'reviewer_required') WHERE NOT EXISTS(SELECT 1 FROM users WHERE id=NEW.reviewer_id AND role='admin' AND suspended=0) OR EXISTS(SELECT 1 FROM organization_members WHERE organization_id=NEW.id AND user_id=NEW.reviewer_id); END;
--> statement-breakpoint
CREATE TRIGGER verified_task_request BEFORE INSERT ON tasks
 BEGIN SELECT RAISE(ABORT,'identity_verification_required') WHERE NOT EXISTS(SELECT 1 FROM users u LEFT JOIN identity_verifications v ON v.user_id=u.id WHERE u.id=NEW.requester_id AND (u.role='admin' OR (u.account_type='individual' AND v.status='verified' AND v.age_eligible=1 AND v.duplicate_status='clear') OR (u.account_type='organization' AND EXISTS(SELECT 1 FROM organizations o JOIN organization_members m ON m.organization_id=o.id WHERE m.user_id=u.id AND m.active=1 AND m.role IN ('owner','program_manager') AND o.status='verified' AND o.review_due>unixepoch())))); END;
--> statement-breakpoint
CREATE TRIGGER verified_task_accept BEFORE UPDATE OF helper_id ON tasks WHEN NEW.helper_id IS NOT NULL AND OLD.helper_id IS NULL
 BEGIN SELECT RAISE(ABORT,'identity_verification_required') WHERE NOT EXISTS(SELECT 1 FROM users u LEFT JOIN identity_verifications v ON v.user_id=u.id WHERE u.id=NEW.helper_id AND (u.role='admin' OR (u.account_type='individual' AND v.status='verified' AND v.age_eligible=1 AND v.duplicate_status='clear') OR (u.account_type='organization' AND EXISTS(SELECT 1 FROM organizations o JOIN organization_members m ON m.organization_id=o.id WHERE m.user_id=u.id AND m.active=1 AND m.role IN ('owner','program_manager') AND o.status='verified' AND o.review_due>unixepoch())))); END;
--> statement-breakpoint
CREATE TRIGGER verification_type_immutable BEFORE UPDATE OF account_type ON users WHEN OLD.account_type<>NEW.account_type BEGIN SELECT RAISE(ABORT,'account_type_immutable'); END;
--> statement-breakpoint
CREATE TRIGGER pending_identity_insert BEFORE INSERT ON identity_verifications WHEN NEW.status='verified' BEGIN SELECT RAISE(ABORT,'review_existing_application_first'); END;
--> statement-breakpoint
CREATE TRIGGER pending_organization_insert BEFORE INSERT ON organizations WHEN NEW.status='verified' BEGIN SELECT RAISE(ABORT,'review_existing_application_first'); END;
--> statement-breakpoint
CREATE TRIGGER verified_onboarding_only BEFORE INSERT ON ledger WHEN NEW.type='onboarding' BEGIN SELECT RAISE(ABORT,'identity_verification_required') WHERE NOT EXISTS(SELECT 1 FROM identity_verifications v JOIN users u ON u.id=v.user_id WHERE v.user_id=NEW.destination_id AND u.account_type='individual' AND v.status='verified' AND v.age_eligible=1 AND v.duplicate_status='clear'); END;
--> statement-breakpoint
CREATE TRIGGER identity_review_requested AFTER INSERT ON identity_verifications BEGIN
 INSERT INTO notifications(id,user_id,text) SELECT lower(hex(randomblob(16))),id,'A member has requested manual verification.' FROM users WHERE role='admin' AND suspended=0;
END;
--> statement-breakpoint
CREATE TRIGGER organization_review_requested AFTER INSERT ON organizations BEGIN
 INSERT INTO notifications(id,user_id,text) SELECT lower(hex(randomblob(16))),id,'A Community Partner application is ready for review.' FROM users WHERE role='admin' AND suspended=0;
END;
--> statement-breakpoint
CREATE TRIGGER identity_review_updated AFTER UPDATE OF status ON identity_verifications WHEN OLD.status<>NEW.status BEGIN
 INSERT INTO notifications(id,user_id,text) VALUES(lower(hex(randomblob(16))),NEW.user_id,'Your verification status has changed. Open verification from your profile.');
END;
--> statement-breakpoint
CREATE TRIGGER organization_review_updated AFTER UPDATE OF status ON organizations WHEN OLD.status<>NEW.status BEGIN
 INSERT INTO notifications(id,user_id,text) SELECT lower(hex(randomblob(16))),user_id,'Your Community Partner verification status has changed. Open verification from your profile.' FROM organization_members WHERE organization_id=NEW.id AND active=1;
END;
