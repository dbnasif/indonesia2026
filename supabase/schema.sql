-- Indonesia 2026 · base compartida. Pegar en Supabase → SQL Editor → Run.
-- Una sola tabla con todos los "documentos" de la app (gastos, notas, días, etc.).
create table if not exists public.docs (
  col        text        not null,               -- colección: gastos, notas, dias, categorias, docs, config
  id         text        not null,
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (col, id)
);

alter table public.docs enable row level security;

-- Solo Dani y Augusto (logueados con su mail) pueden leer y escribir.
drop policy if exists "solo dani y wally" on public.docs;
create policy "solo dani y wally" on public.docs
  for all to authenticated
  using      ((auth.jwt() ->> 'email') in ('danii.nasif@gmail.com', 'augustotraghetti@gmail.com'))
  with check ((auth.jwt() ->> 'email') in ('danii.nasif@gmail.com', 'augustotraghetti@gmail.com'));

-- Cambios en vivo entre los dos celulares.
do $$ begin
  alter publication supabase_realtime add table public.docs;
exception when duplicate_object then null; end $$;
