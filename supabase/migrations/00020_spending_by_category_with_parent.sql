-- Replace spending_by_category to include parent_id and filter out transfers
drop function if exists public.spending_by_category(uuid, date, date);
create or replace function public.spending_by_category(
  p_household_id uuid,
  p_start date,
  p_end date
)
returns table (
  category_id uuid,
  category_name text,
  category_color text,
  category_icon text,
  total numeric,
  parent_id uuid
)
language sql
stable
security definer
as $$
  select
    c.id as category_id,
    c.name as category_name,
    c.color as category_color,
    c.icon as category_icon,
    coalesce(sum(t.amount), 0) as total,
    c.parent_id
  from public.categories c
  left join public.transactions t
    on t.category_id = c.id
    and t.date >= p_start
    and t.date <= p_end
    and t.amount > 0
    and t.is_split = false
    and t.is_transfer = false
  where c.household_id = p_household_id
  group by c.id, c.name, c.color, c.icon, c.parent_id
  having coalesce(sum(t.amount), 0) > 0
  order by total desc;
$$;
