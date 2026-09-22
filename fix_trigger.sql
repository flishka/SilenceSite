-- ==============================================================================
-- Silence External 266 (Company Rust / Devblog 266)
-- Полный фикс триггера и RLS
-- ==============================================================================

-- 1. Удаляем старый проблемный триггер
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- 2. Создаем надежную функцию создания профиля
create or replace function public.handle_new_user()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
declare
    _uname text;
    _role user_role := 'USER'::user_role;
begin
    -- Достаем username или берем имя до @
    _uname := coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1));
    
    -- Очищаем от любых спецсимволов если вдруг попали
    _uname := regexp_replace(_uname, '[^a-zA-Z0-9_]', '', 'g');
    if length(_uname) < 3 then
        _uname := 'user_' || substr(new.id::text, 1, 6);
    end if;

    if lower(_uname) = 'flqshka' then
        _role := 'ADMIN'::user_role;
    end if;

    insert into public.profiles (id, username, email, role, avatar_url, created_at)
    values (
        new.id,
        _uname,
        coalesce(new.raw_user_meta_data->>'real_email', new.email),
        _role,
        'https://api.dicebear.com/7.x/bottts/svg?seed=' || _uname,
        now()
    )
    on conflict (id) do update set
        username = excluded.username,
        email = excluded.email;

    return new;
exception
    when others then
        -- Не даем сорвать регистрацию в auth.users
        return new;
end;
$$;

-- 3. Вешаем триггер заново
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();

-- 4. Политика RLS для вставки в profiles
drop policy if exists "Enable insert for authenticated users" on public.profiles;
create policy "Enable insert for authenticated users" on public.profiles
    for insert with check (true);

-- 5. Обновляем статус под Company Rust / Devblog 266
truncate table public.status;
insert into public.status (value, comment, game_version, ac_version)
values ('Undetected', 'Kernel Driver активен. Поддержка клиентов Company Rust (Devblog 266).', 'Devblog 266 (Company Rust)', 'No AC / Server-Side');
