import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
const id = () => text('id').primaryKey();
const created = () => integer('created_at').notNull().default(sql`(unixepoch())`);
export const users = sqliteTable('users', {
 accountType:text('account_type').notNull().default('individual'), id:id(), email:text('email').notNull().unique(), name:text('name').notNull(), password:text('password').notNull(), recovery:text('recovery').notNull(),
 location:text('location').notNull().default(''), phone:text('phone').notNull().default(''), language:text('language').notNull().default('en'), ageBand:text('age_band').notNull().default(''), skills:text('skills').notNull().default(''), preferences:text('preferences').notNull().default(''), image:text('image'),
 role:text('role').notNull().default('member'), suspended:integer('suspended').notNull().default(0), createdAt:created()
});
export const sessions=sqliteTable('sessions',{id:id(), userId:text('user_id').notNull().references(()=>users.id), expires:integer('expires').notNull()},t=>[index('sessions_user').on(t.userId)]);
export const limits=sqliteTable('rate_limits',{id:id(), count:integer('count').notNull(), expires:integer('expires').notNull()});
export const settings=sqliteTable('settings',{id:id(), value:text('value').notNull()});
export const categories=sqliteTable('categories',{id:id(), name:text('name').notNull().unique(), active:integer('active').notNull().default(1)});
export const tasks=sqliteTable('tasks',{
 id:id(), requesterId:text('requester_id').notNull().references(()=>users.id), helperId:text('helper_id').references(()=>users.id), title:text('title').notNull(), description:text('description').notNull(), categoryId:text('category_id').notNull().references(()=>categories.id), location:text('location').notNull(), remote:integer('remote').notNull(), estimatedSeconds:integer('estimated_seconds').notNull(), requestedAt:integer('requested_at').notNull(), status:text('status').notNull().default('open'), requesterAgreed:integer('requester_agreed').notNull().default(0), helperAgreed:integer('helper_agreed').notNull().default(0), requesterReady:integer('requester_ready').notNull().default(0), helperReady:integer('helper_ready').notNull().default(0), startedAt:integer('started_at'), finishedAt:integer('finished_at'), actualSeconds:integer('actual_seconds'), finishedBy:text('finished_by').references(()=>users.id), confirmedBy:text('confirmed_by').references(()=>users.id), confirmedAt:integer('confirmed_at'), problem:text('problem'), createdAt:created()
},t=>[index('tasks_discovery').on(t.status,t.requestedAt),index('tasks_requester').on(t.requesterId),index('tasks_helper').on(t.helperId)]);
export const ledger=sqliteTable('ledger',{
 id:id(), sourceId:text('source_id').references(()=>users.id), destinationId:text('destination_id').references(()=>users.id), taskId:text('task_id').references(()=>tasks.id), amount:integer('amount').notNull(), type:text('type').notNull(), status:text('status').notNull().default('posted'), actorId:text('actor_id').references(()=>users.id), metadata:text('metadata').notNull(), createdAt:created()
},t=>[index('ledger_source').on(t.sourceId,t.createdAt),index('ledger_destination').on(t.destinationId,t.createdAt),uniqueIndex('ledger_task_type').on(t.taskId,t.type),uniqueIndex('ledger_onboarding_once').on(t.destinationId).where(sql`${t.type} = 'onboarding'`)]);
export const reviews=sqliteTable('reviews',{id:id(),taskId:text('task_id').notNull().references(()=>tasks.id),authorId:text('author_id').notNull().references(()=>users.id),recipientId:text('recipient_id').notNull().references(()=>users.id),rating:integer('rating').notNull(),feedback:text('feedback').notNull(),createdAt:created()},t=>[uniqueIndex('review_once').on(t.taskId,t.authorId),index('reviews_recipient').on(t.recipientId)]);
export const messages=sqliteTable('messages',{id:id(),taskId:text('task_id').notNull().references(()=>tasks.id),senderId:text('sender_id').notNull().references(()=>users.id),content:text('content').notNull(),photo:text('photo'),createdAt:created()},t=>[index('messages_task').on(t.taskId,t.createdAt)]);
export const notifications=sqliteTable('notifications',{id:id(),userId:text('user_id').notNull().references(()=>users.id),taskId:text('task_id').references(()=>tasks.id),text:text('text').notNull(),readAt:integer('read_at'),createdAt:created()},t=>[index('notifications_user').on(t.userId,t.createdAt)]);
export const audit=sqliteTable('admin_actions',{id:id(),actorId:text('actor_id').notNull().references(()=>users.id),action:text('action').notNull(),targetId:text('target_id').notNull(),reason:text('reason').notNull(),createdAt:created()});

export const consents=sqliteTable('agreement_acceptances',{id:id(),userId:text('user_id').notNull().references(()=>users.id),taskId:text('task_id').references(()=>tasks.id),kind:text('kind').notNull(),version:text('version').notNull(),signature:text('signature').notNull(),signatureDrawing:text('signature_drawing'),acceptedAt:integer('accepted_at').notNull().default(sql`(unixepoch())`)},t=>[uniqueIndex('consent_account_once').on(t.userId,t.kind,t.version).where(sql`${t.taskId} IS NULL`),uniqueIndex('consent_task_once').on(t.userId,t.taskId,t.kind,t.version).where(sql`${t.taskId} IS NOT NULL`)]);
export const assistanceEvents=sqliteTable('assistance_events',{id:id(),userId:text('user_id').notNull().references(()=>users.id),kind:text('kind').notNull(),status:text('status').notNull(),model:text('model').notNull(),tokens:integer('tokens').notNull().default(0),createdAt:created()},t=>[index('assistance_time').on(t.createdAt)]);
export const reviewFlags=sqliteTable('review_flags',{id:id(),rule:text('rule').notNull(),subject:text('subject').notNull(),evidence:text('evidence').notNull(),status:text('status').notNull().default('review_recommended'),reason:text('reason'),reviewerId:text('reviewer_id').references(()=>users.id),reviewedAt:integer('reviewed_at'),createdAt:created()},t=>[uniqueIndex('flag_rule_subject').on(t.rule,t.subject)]);
export const taskEvents=sqliteTable('task_events',{id:id(),taskId:text('task_id').notNull().references(()=>tasks.id),status:text('status').notNull(),actorId:text('actor_id').references(()=>users.id),note:text('note'),createdAt:created()},t=>[index('task_events_task').on(t.taskId,t.createdAt)]);
export const matchingPreferences=sqliteTable('matching_preferences',{userId:text('user_id').primaryKey().references(()=>users.id),mode:text('mode').notNull().default('any'),days:text('days').notNull().default('[]'),timezone:text('timezone').notNull().default('UTC'),maxMinutes:integer('max_minutes')});
export const taskInquiryMessages = sqliteTable('task_inquiry_messages', {
 id:id(), taskId:text('task_id').notNull().references(()=>tasks.id), visitorId:text('visitor_id').notNull().references(()=>users.id), senderId:text('sender_id').notNull().references(()=>users.id), content:text('content').notNull(), photo:text('photo'), createdAt:created()
}, t=>[index('inquiry_thread').on(t.taskId,t.visitorId,t.createdAt)]);

export const identity_verifications=sqliteTable('identity_verifications',{
 user_id:text('user_id').primaryKey() .references(()=>users.id),
 legal_name:text('legal_name').notNull().default(sql`''`),
 birth_date:text('birth_date'),
 status:text('status').notNull().default(sql`'incomplete'`),
 age_eligible:integer('age_eligible').notNull().default(sql`0`),
 identity_key:text('identity_key').unique(),
 duplicate_status:text('duplicate_status').notNull().default(sql`'pending'`),
 method:text('method'),
 evidence_reference:text('evidence_reference'),
 reviewer_id:text('reviewer_id') .references(()=>users.id),
 verified_at:integer('verified_at'),
 feedback:text('feedback').notNull().default(sql`''`),
 version:integer('version').notNull().default(sql`0`)
});

export const organizations=sqliteTable('organizations',{
 id:text('id').primaryKey(),
 legal_name:text('legal_name').notNull(),
 public_name:text('public_name').notNull().default(sql`''`),
 jurisdiction:text('jurisdiction').notNull(),
 entity_type:text('entity_type').notNull(),
 registration_id:text('registration_id').notNull(),
 registered_address:text('registered_address').notNull(),
 website:text('website').notNull().default(sql`''`),
 contact_email:text('contact_email').notNull(),
 contact_phone:text('contact_phone').notNull(),
 mission:text('mission').notNull(),
 representative_name:text('representative_name').notNull(),
 representative_role:text('representative_role').notNull(),
 representative_email:text('representative_email').notNull(),
 status:text('status').notNull().default(sql`'submitted'`),
 registry_checked:integer('registry_checked').notNull().default(sql`0`),
 representative_checked:integer('representative_checked').notNull().default(sql`0`),
 activity_checked:integer('activity_checked').notNull().default(sql`0`),
 evidence_reference:text('evidence_reference').notNull().default(sql`''`),
 feedback:text('feedback').notNull().default(sql`''`),
 reviewer_id:text('reviewer_id') .references(()=>users.id),
 verified_at:integer('verified_at'),
 review_due:integer('review_due'),
 version:integer('version').notNull().default(sql`0`),
 created_at:integer('created_at').notNull().default(sql`unixepoch()`)
},t=>[uniqueIndex('organization_identity').on(t.jurisdiction,t.registration_id)]);

export const organization_members=sqliteTable('organization_members',{
 id:text('id').primaryKey(),
 organization_id:text('organization_id').notNull() .references(()=>organizations.id),
 user_id:text('user_id').notNull() .references(()=>users.id),
 role:text('role').notNull(),
 active:integer('active').notNull().default(sql`1`)
},t=>[uniqueIndex('organization_member_once').on(t.organization_id,t.user_id),index('organization_member_user').on(t.user_id,t.active)]);

export const organization_invites=sqliteTable('organization_invites',{
 id:text('id').primaryKey(),
 organization_id:text('organization_id').notNull() .references(()=>organizations.id),
 email:text('email').notNull(),
 role:text('role').notNull(),
 expires:integer('expires').notNull(),
 invited_by:text('invited_by').notNull() .references(()=>users.id),
 accepted_by:text('accepted_by') .references(()=>users.id)
});

export const verification_messages=sqliteTable('verification_messages',{
 id:text('id').primaryKey(),
 user_id:text('user_id').notNull() .references(()=>users.id),
 organization_id:text('organization_id') .references(()=>organizations.id),
 sender_id:text('sender_id').notNull() .references(()=>users.id),
 content:text('content').notNull(),
 created_at:integer('created_at').notNull().default(sql`unixepoch()`)
},t=>[index('verification_message_user').on(t.user_id,t.created_at),index('verification_message_org').on(t.organization_id,t.created_at)]);

export const verification_policies=sqliteTable('verification_policies',{
 jurisdiction:text('jurisdiction').primaryKey(),
 identifier_label:text('identifier_label').notNull(),
 documents:text('documents').notNull(),
 activity_required:integer('activity_required').notNull().default(sql`0`)
});

export const partnerPrograms=sqliteTable('partner_programs',{
 id:id(),organizationId:text('organization_id').notNull().references(()=>organizations.id),kind:text('kind').notNull(),title:text('title').notNull(),description:text('description').notNull(),status:text('status').notNull().default('draft'),categoryId:text('category_id').references(()=>categories.id),location:text('location').notNull(),requestedAt:integer('requested_at'),duration:integer('duration').notNull().default(3600),capacity:integer('capacity').notNull().default(20),requirements:text('requirements').notNull().default(''),materials:text('materials').notNull().default(''),modules:text('modules').notNull().default(''),completion:text('completion').notNull().default(''),badge:text('badge').notNull().default(''),validDays:integer('valid_days'),requiredTrainingId:text('required_training_id'),relatedProgramId:text('related_program_id'),skills:text('skills').notNull().default(''),budget:integer('budget').notNull().default(0),version:integer('version').notNull().default(0),createdBy:text('created_by').notNull().references(()=>users.id),createdAt:created()
},t=>[index('partner_program_org').on(t.organizationId,t.status)]);
export const partnerEnrollments=sqliteTable('partner_enrollments',{
 id:id(),programId:text('program_id').notNull().references(()=>partnerPrograms.id),userId:text('user_id').notNull().references(()=>users.id),role:text('role').notNull().default('participant'),status:text('status').notNull().default('enrolled'),progress:text('progress').notNull().default(''),reviewNote:text('review_note').notNull().default(''),reviewerId:text('reviewer_id').references(()=>users.id),completedAt:integer('completed_at'),createdAt:created()
},t=>[uniqueIndex('partner_enrollment_once').on(t.programId,t.userId),index('partner_enrollment_user').on(t.userId)]);
export const partnerBadges=sqliteTable('partner_badges',{
 id:id(),programId:text('program_id').notNull().references(()=>partnerPrograms.id),userId:text('user_id').notNull().references(()=>users.id),label:text('label').notNull(),issuedBy:text('issued_by').notNull().references(()=>users.id),expiresAt:integer('expires_at'),revokedAt:integer('revoked_at'),reason:text('reason').notNull(),createdAt:created()
},t=>[uniqueIndex('partner_badge_once').on(t.programId,t.userId)]);
export const partnerTaskLinks=sqliteTable('partner_task_links',{
 taskId:text('task_id').primaryKey().references(()=>tasks.id),programId:text('program_id').notNull().references(()=>partnerPrograms.id),requiredTrainingId:text('required_training_id').references(()=>partnerPrograms.id)
},t=>[index('partner_task_program').on(t.programId)]);
export const partnerSupport=sqliteTable('partner_support',{
 id:id(),programId:text('program_id').notNull().references(()=>partnerPrograms.id),userId:text('user_id').notNull().references(()=>users.id),amount:integer('amount').notNull(),reason:text('reason').notNull(),status:text('status').notNull().default('pending'),reviewNote:text('review_note').notNull().default(''),reviewerId:text('reviewer_id').references(()=>users.id),ledgerId:text('ledger_id').unique(),createdAt:created()
},t=>[uniqueIndex('partner_support_once').on(t.programId,t.userId)]);
export const partnerMatches=sqliteTable('partner_matches',{
 id:id(),programId:text('program_id').notNull().references(()=>partnerPrograms.id),sharerId:text('sharer_id').notNull().references(()=>users.id),learnerId:text('learner_id').notNull().references(()=>users.id),status:text('status').notNull().default('matched'),sharerConfirmed:integer('sharer_confirmed').notNull().default(0),learnerConfirmed:integer('learner_confirmed').notNull().default(0),taskId:text('task_id').references(()=>tasks.id),createdAt:created()
},t=>[uniqueIndex('partner_match_once').on(t.programId,t.sharerId,t.learnerId)]);
export const partnerSupportUsage=sqliteTable('partner_support_usage',{
 id:id(),supportId:text('support_id').notNull().references(()=>partnerSupport.id),ledgerId:text('ledger_id').notNull().references(()=>ledger.id),amount:integer('amount').notNull()
},t=>[uniqueIndex('partner_usage_once').on(t.supportId,t.ledgerId)]);

// Silver Care is owner-scoped and intentionally separate from public profiles.
export const carePreferences=sqliteTable('care_preferences',{userId:text('user_id').primaryKey().references(()=>users.id),consentedAt:integer('consented_at').notNull(),aiConsentedAt:integer('ai_consented_at'),aiAutoSave:integer('ai_auto_save').notNull().default(1),bankConsent:integer('bank_consent').notNull().default(0),activity:text('activity').notNull().default('[]'),notifications:integer('notifications').notNull().default(1),reminderHour:integer('reminder_hour'),updatedAt:integer('updated_at').notNull().default(sql`(unixepoch())`)});
export const careRecords=sqliteTable('care_records',{id:id(),userId:text('user_id').notNull().references(()=>users.id),kind:text('kind').notNull(),occurredAt:integer('occurred_at').notNull(),data:text('data').notNull(),version:integer('version').notNull().default(1),createdAt:created()},t=>[index('care_records_owner').on(t.userId,t.occurredAt)]);
export const careDevices=sqliteTable('care_devices',{id:id(),userId:text('user_id').notNull().references(()=>users.id),name:text('name').notNull(),provider:text('provider').notNull(),tokenHash:text('token_hash'),permissions:text('permissions').notNull().default('[]'),active:integer('active').notNull().default(1),lastSync:integer('last_sync'),createdAt:created()},t=>[index('care_device_owner').on(t.userId),uniqueIndex('care_device_token').on(t.tokenHash)]);
export const careMeasurements=sqliteTable('care_measurements',{id:id(),userId:text('user_id').notNull().references(()=>users.id),deviceId:text('device_id').notNull().references(()=>careDevices.id),externalId:text('external_id').notNull(),kind:text('kind').notNull(),value:integer('value').notNull(),unit:text('unit').notNull(),measuredAt:integer('measured_at').notNull(),createdAt:created()},t=>[index('care_measure_owner').on(t.userId,t.measuredAt),uniqueIndex('care_measure_once').on(t.deviceId,t.externalId)]);
export const careSummaries=sqliteTable('care_summaries',{id:id(),userId:text('user_id').notNull().references(()=>users.id),title:text('title').notNull(),content:text('content').notNull(),appointmentAt:integer('appointment_at'),version:integer('version').notNull().default(1),createdAt:created()},t=>[index('care_summary_owner').on(t.userId)]);
export const careShares=sqliteTable('care_shares',{id:id(),userId:text('user_id').notNull().references(()=>users.id),recipientId:text('recipient_id').notNull().references(()=>users.id),summaryId:text('summary_id').notNull().references(()=>careSummaries.id),snapshot:text('snapshot').notNull(),expires:integer('expires').notNull(),revokedAt:integer('revoked_at'),createdAt:created()},t=>[index('care_share_recipient').on(t.recipientId,t.expires)]);
export const careAudit=sqliteTable('care_audit',{id:id(),userId:text('user_id').notNull().references(()=>users.id),actorId:text('actor_id').notNull().references(()=>users.id),action:text('action').notNull(),targetId:text('target_id'),createdAt:created()},t=>[index('care_audit_owner').on(t.userId,t.createdAt)]);

export const careConversations=sqliteTable('care_conversations',{id:id(),userId:text('user_id').notNull().references(()=>users.id),title:text('title').notNull(),messages:text('messages').notNull().default('[]'),version:integer('version').notNull().default(1),createdAt:created(),updatedAt:integer('updated_at').notNull().default(sql`(unixepoch())`)},t=>[index('care_conversation_owner').on(t.userId,t.updatedAt)]);
export const careFamily=sqliteTable('care_family',{id:id(),userId:text('user_id').notNull().references(()=>users.id),name:text('name').notNull(),relationship:text('relationship').notNull().default(''),phone:text('phone').notNull(),version:integer('version').notNull().default(1),createdAt:created()},t=>[index('care_family_owner').on(t.userId)]);
