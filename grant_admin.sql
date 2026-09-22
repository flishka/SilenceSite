-- 1. Сделать flqshka админом прямо сейчас во всех существующих записях
update public.profiles 
set role = 'ADMIN'::user_role 
where username = 'flqshka' or lower(username) = 'flqshka';

-- 2. Если профиль еще не создался в таблице profiles, создать его вручную из auth.users
insert into public.profiles (id, username, email, role, created_at)
select id, 'flqshka', email, 'ADMIN'::user_role, now()
from auth.users
where email like 'flqshka%' or raw_user_meta_data->>'username' = 'flqshka'
on conflict (id) do update set role = 'ADMIN'::user_role;

-- 3. Разрешить публичное чтение профилей (чтобы ник отображался на сайте без задержек)
drop policy if exists "Public profiles read" on public.profiles;
create policy "Public profiles read" on public.profiles for select using (true);

