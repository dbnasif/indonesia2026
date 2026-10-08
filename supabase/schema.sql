-- Indonesia 2026 · base compartida. Pegar en Supabase → SQL Editor → Run.
-- Tabla propia (indonesia_docs): se puede crear dentro de un proyecto Supabase que ya exista sin tocar sus otras tablas.
-- Una sola tabla con todos los "documentos" de la app (gastos, notas, días, etc.).
create table if not exists public.indonesia_docs (
  col        text        not null,               -- colección: gastos, notas, dias, categorias, docs, config
  id         text        not null,
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (col, id)
);

alter table public.indonesia_docs enable row level security;

-- Solo Dani y Augusto (logueados con su mail) pueden leer y escribir.
drop policy if exists "indonesia: solo dani y wally" on public.indonesia_docs;
create policy "indonesia: solo dani y wally" on public.indonesia_docs
  for all to authenticated
  using      ((auth.jwt() ->> 'email') in ('danii.nasif@gmail.com', 'augustotraghetti@gmail.com'))
  with check ((auth.jwt() ->> 'email') in ('danii.nasif@gmail.com', 'augustotraghetti@gmail.com'));

-- Cambios en vivo entre los dos celulares.
do $$ begin
  alter publication supabase_realtime add table public.indonesia_docs;
exception when duplicate_object then null; end $$;
