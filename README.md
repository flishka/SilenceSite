# Silence External 266 · Engineering Devblog & Distribution Hub

Технический портал и девблог приватного проекта **Silence External 266** (Rust external cheat).
Стек: Чистый HTML5 + CSS3 + Vanilla ES Modules, Supabase (Postgres, Auth, RLS, Real-time), развертывание на GitHub Pages.

---

## 📁 Архитектура файлов

```text
/
├── index.html           # Публичный лендинг (Hero, Devlog, Features, Status, Roadmap, Media, FAQ, Access)
├── login.html           # Авторизация (Supabase Auth, remember me, валидация)
├── register.html        # Регистрация (шкала сложности пароля, email mapping)
├── me.html              # Личный кабинет пользователя (загрузка, статус лицензии)
├── admin.html           # Админ-панель (Dashboard, Users, Posts CRUD, Status, FAQ, Audit)
├── schema.sql           # Полный SQL-дамп схемы Postgres для Supabase
├── robots.txt           # Директивы краулеров
├── sitemap.xml          # XML карта сайта
├── css/
│   ├── reset.css        # Сброс базовых стилей
│   ├── tokens.css       # CSS-переменные дизайн-системы (Dark/Light темы)
│   ├── base.css         # Типографика, сетка, скроллбары
│   ├── components.css   # Кнопки, инпуты, модалки, аккордеон, рипплы
│   ├── public.css       # Стили разделов главной страницы
│   ├── auth.css         # Стили форм входа, регистрации и профиля
│   └── admin.css        # Стили панели администратора и таблиц
└── js/
    ├── supabase.js      # Инициализация Supabase SDK + API-слой
    ├── markdown.js      # Zero-dependency Markdown -> HTML парсер
    ├── ui.js            # Тема, эффекты (ripple, lightbox, accordion, observer)
    ├── auth.js          # Сессии, валидаторы, guard ролей
    ├── public.js        # Загрузка динамических данных на главной
    └── admin.js         # Контроллер CRUD операций и графиков в админке
```

---

## 🚀 Пошаговое развертывание проекта

### Шаг 1. Создание проекта в Supabase
1. Перейдите на [supabase.com](https://supabase.com) и создайте новый проект (например, `silence-266`).
2. В боковом меню откройте **Project Settings** → **API**.
3. Скопируйте **Project URL** и публичный **anon / public key**.
4. Откройте `js/supabase.js` и вставьте ваши значения в переменные `SUPABASE_URL` и `SUPABASE_ANON_KEY`:
   ```javascript
   export const SUPABASE_URL = 'https://ваш-проект.supabase.co';
   export const SUPABASE_ANON_KEY = 'ваш-anon-ключ';
   ```

### Шаг 2. Развертывание базы данных и политик RLS
1. В Supabase перейдите во вкладку **SQL Editor**.
2. Нажмите **New Query**, скопируйте содержимое файла `schema.sql` целиком и нажмите **Run**.
3. Скрипт создаст:
   - Таблицы `profiles`, `status`, `posts`, `features`, `roadmap`, `faq`, `audit_log`, `settings`.
   - Автоматический триггер `on_auth_user_created`: при регистрации пользователя с логином **flqshka** ему мгновенно выдается роль **ADMIN**.
   - RLS-политики: публичный доступ только на чтение разрешенных данных, запись и удаление строго для роли ADMIN.
   - Триггеры аудита безопасности: любые изменения логируются в `audit_log`.

### Шаг 3. Настройка аутентификации Supabase
1. Откройте **Authentication** → **Providers** → **Email**.
2. Убедитесь, что переключатель **Enable Email provider** включен.
3. Отключите **Confirm email** (в разделе Email Auth), если хотите, чтобы пользователи могли сразу входить без подтверждения почты по ссылке.

### Шаг 4. Публикация на GitHub Pages
1. Инициализируйте репозиторий в папке проекта:
   ```bash
   git init
   git add .
   git commit -m "feat: initial Silence 266 production deployment"
   ```
2. Создайте репозиторий на GitHub (например, `Silence` или `silencedev.github.io`).
3. Привяжите remote и запушьте ветку:
   ```bash
   git remote add origin https://github.com/flishka/Silence.git
   git branch -M main
   git push -u origin main
   ```
4. В репозитории GitHub перейдите в **Settings** → **Pages**:
   - Source: `Deploy from a branch`
   - Branch: `main` / folder: `/ (root)`
   - Нажмите **Save**. Сайт будет доступен через 1-2 минуты.

### Шаг 5. Подключение собственного домена SilenceDev
1. В настройках **Settings** → **Pages** найдите поле **Custom domain** и введите ваш домен (например, `silencedev.com` или поддомен).
2. В панели управления DNS вашего регистратора добавьте записи:
   - Для поддомена (например `app.silencedev.com`): `CNAME` → `ваш-аккаунт.github.io`
   - Для apex-домена (`silencedev.com`): `A`-записи на IP GitHub Pages:
     - `185.199.108.153`
     - `185.199.109.153`
     - `185.199.110.153`
     - `185.199.111.153`
3. Отметьте чекбокс **Enforce HTTPS** после выпуска SSL-сертификата.

---

## 🛡️ Безопасность и администрирование
- Для получения первого админ-аккаунта зарегистрируйтесь через страницу `register.html` с именем пользователя `flqshka`.
- После входа в шапке сайта и в профиле появится бейдж и ссылка в **Admin Panel** (`admin.html`).
- Попытки доступа неавторизованных пользователей к `/admin.html` блокируются как на уровне роут-гарда на клиенте, так и на уровне RLS-политик Postgres.

