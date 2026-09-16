# CarbonTrace Project Dependencies

This document defines the required backend dependencies, database requirements, and solver configurations for the CarbonTrace project.

---

## Backend Python Dependencies

The following backend packages serve as the source of truth for the CarbonTrace Python environment:

| Package | Version Specification | Purpose |
|---|---|---|
| `fastapi` | `>=0.110.0,<1.0.0` | High-performance asynchronous REST API framework for routing, dependency injection, and HTTP endpoints. |
| `uvicorn[standard]` | `>=0.28.0,<1.0.0` | ASGI web server for running the FastAPI application locally and in production. |
| `pydantic` | `>=2.6.0,<3.0.0` | Data validation, type enforcement, and request/response schema serialization. |
| `sqlalchemy` | `>=2.0.0,<3.0.0` | SQL toolkit and Object-Relational Mapper (ORM 2.x) for relational database modeling and queries. |
| `pandas` | `>=2.2.0,<3.0.0` | Data manipulation, tabular emissions analysis, and batch aggregation. |
| `psycopg2-binary` | `>=2.9.9,<3.0.0` | PostgreSQL database adapter for Python/SQLAlchemy connectivity. |
| `python-dotenv` | `>=1.0.0,<2.0.0` | Environment variable management from `.env` files. |
| `pulp` | (latest compatible) | Linear programming modeling framework used for emissions reduction and cost optimization. |

---

## Database & Solvers

- **Database**: **PostgreSQL 17** is the primary local relational database used by the project for persisting companies, suppliers, and carbon activities.
- **Optimization Solver**: **Coin-or branch and cut (CBC)** is the default linear/integer programming solver used by `PuLP` for reduction pathway optimization.

---

## Scope Notes

- **Frontend**: React/Vite/TypeScript frontend dependencies are managed separately within `frontend/package.json` and are deliberately excluded from this file.
- **Minimal Footprint**: No alternative databases (e.g., SQLite, MongoDB, Firebase) or external queue brokers are permitted.
