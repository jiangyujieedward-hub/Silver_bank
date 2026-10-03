"""Explicit synthetic manual verification for isolated SQL fixtures only."""
def verify_members(c):
 c.execute("INSERT INTO users(id,email,name,password,recovery,role) VALUES('fixture-reviewer','reviewer@example.invalid','Fixture reviewer','test','test','admin')")
 members=c.execute("SELECT id FROM users WHERE role<>'admin'").fetchall()
 for (user_id,) in members:
  c.execute("INSERT INTO identity_verifications(user_id,legal_name,birth_date,status) VALUES(?,?,'1990-01-01','under_review')",(user_id,user_id))
  c.execute("UPDATE identity_verifications SET status='verified',age_eligible=1,duplicate_status='clear',identity_key=?,reviewer_id='fixture-reviewer',verified_at=unixepoch(),evidence_reference='Synthetic isolated test fixture' WHERE user_id=?",('fixture:'+user_id,user_id))
