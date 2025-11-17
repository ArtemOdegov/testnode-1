# API для бронирования мест на мероприятия

API для управления бронированием мест на мероприятиях с проверкой уникальности бронирования.

## Требования

- Node.js (версия 14 или выше)
- PostgreSQL (версия 12 или выше)

## Установка

1. Установите зависимости:
```bash
npm install
```

2. Настройте параметры подключения к базе данных в файле `config.json`:
```json
{
  "database": {
    "host": "localhost",
    "port": 5432,
    "name": "booking_db",
    "user": "postgres",
    "password": "postgres"
  },
  "server": {
    "port": 3000
  }
}
```

3. Создайте базу данных PostgreSQL:
```sql
CREATE DATABASE booking_db;
```

4. Запустите миграции (автоматически выполняются при старте сервера):
```bash
npm run migrate
```

5. Запустите сервер:
```bash
npm start
```

Для разработки с автоматической перезагрузкой:
```bash
npm run dev
```

## Проверка и запуск всех сервисов

### Шаг 1: Установка зависимостей
```bash
npm install
```

### Шаг 2: Настройка базы данных
Убедитесь, что PostgreSQL запущен и создайте базу данных:
```bash
createdb booking_db
# или через psql:
psql -U postgres -c "CREATE DATABASE booking_db;"
```

### Шаг 3: Настройка конфигурации
Отредактируйте `config.json` с вашими параметрами подключения к базе данных:
```json
{
  "database": {
    "host": "localhost",
    "port": 5432,
    "name": "booking_db",
    "user": "postgres",
    "password": "postgres"
  },
  "server": {
    "port": 3000
  }
}
```

### Шаг 4: Проверка базы данных и создание таблиц
Запустите проверку подключения и создание таблиц:
```bash
npm run test:setup
```

Этот скрипт:
- Проверяет подключение к базе данных
- Проверяет наличие таблиц `events` и `bookings`
- Создает тестовое событие (если не существует)
- Показывает статистику

Если таблицы отсутствуют, запустите миграции вручную:
```bash
npm run migrate
```

### Шаг 5: Запуск сервера
```bash
npm start
```

Сервер автоматически запустит миграции при старте (если таблицы не существуют).

Вы увидите сообщение:
```
Сервер запущен на порту 3000
Подключение к базе данных установлено
Миграции выполнены успешно
```

### Шаг 6: Проверка работы API
В **новом терминале** запустите тесты API:
```bash
npm run test:api
```

Этот скрипт проверяет:
- Health check endpoint (`GET /health`)
- Обработку несуществующих маршрутов (404)
- Валидацию входных данных
- Создание бронирования
- Защиту от дублирования бронирований

### Ручная проверка через curl

**1. Проверка здоровья сервера:**
```bash
curl http://localhost:3000/health
```

**2. Бронирование места:**
```bash
curl -X POST http://localhost:3000/api/bookings/reserve \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": 1,
    "user_id": "user123"
  }'
```

**3. Попытка повторного бронирования (должна вернуть ошибку 409):**
```bash
curl -X POST http://localhost:3000/api/bookings/reserve \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": 1,
    "user_id": "user123"
  }'
```

**4. Тест валидации (должна вернуть ошибку 400):**
```bash
curl -X POST http://localhost:3000/api/bookings/reserve \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": 1
  }'
```

## API Endpoints

### POST /api/bookings/reserve

Бронирование места на мероприятие.

**Запрос:**
```json
{
  "event_id": 1,
  "user_id": "user123"
}
```

**Успешный ответ (201):**
```json
{
  "success": true,
  "booking": {
    "id": 1,
    "event_id": 1,
    "user_id": "user123",
    "created_at": "2024-01-15T10:30:00.000Z"
  },
  "message": "Место успешно забронировано"
}
```

**Ошибки:**

- `400` - Отсутствуют обязательные поля (event_id или user_id)
- `404` - Событие не найдено
- `409` - Пользователь уже забронировал место на это событие
- `409` - Все места на событие уже забронированы
- `500` - Внутренняя ошибка сервера

### GET /health

Проверка состояния сервера и подключения к базе данных.

## Структура базы данных

### Таблица `events`
- `id` (SERIAL PRIMARY KEY)
- `name` (VARCHAR)
- `total_seats` (INT)

### Таблица `bookings`
- `id` (SERIAL PRIMARY KEY)
- `event_id` (INT, ссылка на events)
- `user_id` (VARCHAR)
- `created_at` (TIMESTAMP)
- Уникальное ограничение на `(event_id, user_id)` - один пользователь не может забронировать дважды на одно событие

## Пример использования

### Создание события (через SQL):
```sql
INSERT INTO events (name, total_seats) VALUES ('Концерт', 100);
```

### Бронирование места:
```bash
curl -X POST http://localhost:3000/api/bookings/reserve \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": 1,
    "user_id": "user123"
  }'
```

## Особенности реализации

- Автоматическая проверка дублирования бронирований на уровне базы данных (UNIQUE constraint)
- Проверка существования события перед бронированием
- Проверка доступности мест
- Транзакционная обработка для обеспечения целостности данных

