-- Product metadata required for genuine MRP pricing, search, and faceted filters.
-- Run once in Supabase Dashboard -> SQL Editor.

alter table public.products
  add column if not exists mrp numeric(12, 2),
  add column if not exists metal text,
  add column if not exists colour text,
  add column if not exists styles text[] not null default '{}',
  add column if not exists search_keywords text[] not null default '{}';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_mrp_positive'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_mrp_positive
      check (mrp is null or mrp > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_mrp_not_below_price'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_mrp_not_below_price
      check (mrp is null or mrp >= price);
  end if;
end
$$;

create index if not exists products_price_idx
  on public.products (price);

create index if not exists products_category_idx
  on public.products (category);

create index if not exists products_metal_lower_idx
  on public.products (lower(metal))
  where metal is not null;

create index if not exists products_colour_lower_idx
  on public.products (lower(colour))
  where colour is not null;

create index if not exists products_styles_gin_idx
  on public.products using gin (styles);

create index if not exists products_search_keywords_gin_idx
  on public.products using gin (search_keywords);

comment on column public.products.mrp is
  'Genuine maximum retail price. Leave null or equal to price when the product is not discounted.';
comment on column public.products.metal is
  'Normalized jewellery material/metal used by collection filters.';
comment on column public.products.colour is
  'Normalized display colour used by collection filters.';
comment on column public.products.styles is
  'Controlled style/occasion values such as Everyday, Office, Party, or Wedding.';
comment on column public.products.search_keywords is
  'Additional normalized phrases used by product autocomplete and search.';
