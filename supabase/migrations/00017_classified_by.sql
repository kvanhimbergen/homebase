-- Add classified_by column to transactions
alter table transactions
  add column classified_by text
  check (classified_by in ('user', 'ai', 'plaid'));

-- Backfill existing Plaid transactions that have a category
update transactions
  set classified_by = 'plaid'
  where source = 'plaid'
    and category_id is not null
    and classified_by is null;
