-- Назначение прав ADMIN пользователю flqshka (без конфликтов и дубликатов)
UPDATE public.profiles 
SET role = 'ADMIN'::user_role 
WHERE username = 'flqshka' OR username ILIKE 'flqshka';
