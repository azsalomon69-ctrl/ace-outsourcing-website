alter table public.jobs
  add column if not exists application_url text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'jobs_application_url_https'
      and conrelid = 'public.jobs'::regclass
  ) then
    alter table public.jobs
      add constraint jobs_application_url_https
      check (application_url is null or application_url ~ '^https://');
  end if;
end
$$;
