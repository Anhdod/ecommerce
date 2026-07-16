# Ecommerce Fullstack

Fullstack ecommerce application built with Spring Boot, React, MySQL, Redis, Docker, and GitHub Actions.

## Tech Stack

- Backend: Spring Boot 4, Spring Security, Spring Data JPA, JWT, Swagger/OpenAPI, Actuator
- Frontend: React, Vite, React Router
- Database: MySQL
- Cache / Session Store: Redis
- DevOps: Docker, Docker Compose, GitHub Actions

## Features

- User authentication with JWT access token and Redis-backed refresh token
- Product browsing, product detail, categories, wishlist, cart, checkout, orders, payments
- Admin dashboard with revenue, order status, top selling products, and top customers
- Redis cache for admin dashboard data
- Swagger/OpenAPI API documentation
- Docker Compose setup for backend, frontend, MySQL, and Redis
- CI workflow for backend tests and frontend build

## Project Structure

```text
ecommerce/
├── backend/              # Spring Boot API
├── frontend/             # React Vite app
├── docker-compose.yml
├── .env.example
└── .github/workflows/ci.yml
```

## Run With Docker

Copy the example environment file:

```bash
cp .env.example .env
```

Start the full stack:

```bash
docker compose up --build
```

Services:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8080`
- Swagger UI: `http://localhost:8080/swagger-ui.html`
- Health check: `http://localhost:8080/actuator/health`
- MySQL: `localhost:3306`
- Redis: `localhost:6379`

## Run Locally

Start MySQL and Redis, then run the backend:

```bash
cd backend
mvn spring-boot:run
```

Run the frontend:

```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

Use `.env.example` as the template. Keep `.env` local and do not commit it.

```env
MYSQL_DATABASE=ecommerce_db
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_ALLOW_EMPTY_PASSWORD=yes
SPRING_PROFILES_ACTIVE=docker
REDIS_HOST=redis
REDIS_PORT=6379
VITE_API_BASE_URL=http://localhost:8080
FRONTEND_PORT=3000
```

## CI

GitHub Actions runs:

- Backend: `mvn test`
- Frontend: `npm ci` and `npm run build`

## Security Notes

- `.env`, logs, build outputs, uploaded files, and local token files are ignored by Git.
- Refresh tokens are stored in Redis and removed on logout.
