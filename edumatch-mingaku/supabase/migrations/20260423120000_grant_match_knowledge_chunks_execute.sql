-- match_knowledge_chunks を authenticated / service_role が実行できるようにする
-- （EXECUTE が無いと PostgREST の rpc は常に失敗し、チャット RAG が 0 件になる）

do $$
declare
  argtypes text;
begin
  select pg_catalog.oidvectortypes(p.proargtypes)
    into argtypes
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'match_knowledge_chunks';

  if argtypes is not null then
    execute format(
      'grant execute on function public.match_knowledge_chunks(%s) to authenticated, service_role',
      argtypes
    );
  end if;
end $$;
