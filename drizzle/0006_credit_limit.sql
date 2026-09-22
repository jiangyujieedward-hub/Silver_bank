-- Atomic spending protection includes reservations made by concurrent requests.
CREATE TRIGGER ledger_balance_guard BEFORE INSERT ON ledger
WHEN NEW.source_id IS NOT NULL AND NEW.type IN ('reserve','transfer','adjustment')
BEGIN
 SELECT RAISE(ABORT,'insufficient_credit') WHERE NEW.amount>COALESCE((SELECT available FROM balances WHERE user_id=NEW.source_id),0);
END;
