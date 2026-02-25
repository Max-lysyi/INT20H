<<<<<<< HEAD
# Delivery Tax Calculator (BetterMe Test Task)

Це Fullstack додаток для розрахунку податків на доставку дронами в штаті Нью-Йорк. Система визначає податкову юрисдикцію (NYC, Albany, Syracuse, Yonkers або загальний штат) на основі координат та розраховує фінальну вартість замовлення.

## 🚀 Функціонал

- **Імпорт CSV:** Швидке завантаження тисяч замовлень через потокову обробку.
- **Розумний розрахунок податків:** Автоматичне визначення ставки податку залежно від геолокації (Latitude/Longitude).
- **Ручне створення:** Можливість додати замовлення через форму.
- **Адмін-панель:** Перегляд списку замовлень, пагінація, фільтрація (базова).

## 🛠 Технології

- **Frontend:** React, Tailwind CSS, Lucide Icons.
- **Backend:** Node.js, Express.
- **Database:** PostgreSQL.

## ⚙️ Як запустити проект

### 1. Налаштування Бази Даних
Переконайтеся, що у вас встановлено PostgreSQL.
1. Створіть базу даних з назвою `delivery_db`.
2. Таблиця `orders` створиться автоматично при першому запиті, або ви можете виконати SQL-скрипт:
```sql
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    subtotal DECIMAL(10, 2),
    tax_amount DECIMAL(10, 2),
    total_amount DECIMAL(10, 2),
    jurisdiction VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);






# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
=======
# INT20H
INT20H - This is a task for passing the selection for the INT20H hackathon in which the use of the API with polygons was implemented. Frontend: React(Vite) Teilwind JS. Beckend: pgAdmin 4, SQL, Node.js
>>>>>>> 8370f60f87538940d2b4afb046df006b77a8dc3d
