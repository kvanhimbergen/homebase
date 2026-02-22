-- Transfer linking fields
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS transfer_pair_id uuid REFERENCES transactions(id) ON DELETE SET NULL;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_transfer boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_transactions_transfer_pair ON transactions (transfer_pair_id);

-- Check number field
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS check_number text;

-- Seed "Transfer" system category for existing households
INSERT INTO categories (household_id, name, icon, color, is_system)
SELECT h.id, 'Transfer', 'arrow-left-right', 'var(--color-category-13)', true
FROM households h
WHERE NOT EXISTS (
  SELECT 1 FROM categories c WHERE c.household_id = h.id AND c.name = 'Transfer'
);

-- Update spending_by_category to exclude transfers
CREATE OR REPLACE FUNCTION spending_by_category(p_household_id uuid, p_start date, p_end date)
RETURNS TABLE (category_id uuid, category_name text, category_color text, category_icon text, total numeric)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    c.id as category_id,
    c.name as category_name,
    c.color as category_color,
    c.icon as category_icon,
    coalesce(sum(t.amount), 0) as total
  FROM public.categories c
  LEFT JOIN public.transactions t
    ON t.category_id = c.id
    AND t.date >= p_start
    AND t.date <= p_end
    AND t.amount > 0
    AND t.is_split = false
    AND t.is_transfer = false
  WHERE c.household_id = p_household_id
  GROUP BY c.id, c.name, c.color, c.icon
  HAVING coalesce(sum(t.amount), 0) > 0
  ORDER BY total DESC;
$$;
