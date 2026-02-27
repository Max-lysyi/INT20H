# Test Exercise Documentation

## Overview

This is a **Fullstack Delivery Tax Calculator** application developed as part of the **BetterMe INT20H** test task. The system calculates delivery taxes for drone shipments in New York State based on geographic location.

To solve the problem of obtaining the correct coordinates for calculating taxes, we used a geospatial database because it allows us to work with geographic location, characteristics, and spatial relationships quite easily. The solution was made because the use of third-party applications (APIs) was prohibited. Therefore, we load geo data from our geojson, which we obtained from the open data of New York. This solution allows us to be autonomous with geo data, since the application does not depend on another third-party service and does not depend on the state of this server. The main problem is that if the third-party service cannot function normally, our application will work and process data from the database, since our service does not depend on others. Also, the advantage of this solution is that we do not request data from another service, which helps save money for the business because we do not use the services of other services.

---

## 📋 Task Description

### Objective

Build a fullstack web application that:
- Imports and processes CSV files containing delivery orders
- Calculates tax rates based on geographic coordinates (Latitude/Longitude)
- Determines tax jurisdiction (NYC, Albany, Syracuse, Yonkers, or general NY state)
- Provides both bulk import and manual order creation capabilities

---

## 🏗 Architecture

### Frontend
- **Framework:** React 19.2.0
- **Styling:** Tailwind CSS 4.2.1
- **Icons:** Lucide React
- **CSV Processing:** PapaParse
- **Build Tool:** Vite 7.3.1

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js 5.2.1
- **Database Driver:** PostgreSQL
- **File Upload:** Multer
- **CSV Parsing:** csv-parser

### Database
- **Type:** PostgreSQL with PostGIS extension
- **Purpose:** Store orders and geographic data for tax jurisdiction lookup

---


### Manual Testing Checklist

#### 1. Application Startup
- [ ] Run `make build` to build Docker images
- [ ] Run `make start` to start the application
- [ ] Verify application is accessible at `http://0.0.0.0:10000`
- [ ] Check Docker containers are running: `docker compose ps`

#### 2. CSV Import Feature
- [ ] Prepare a CSV file with order data (coordinates, order details)
- [ ] Navigate to the import page
- [ ] Upload the CSV file
- [ ] Verify orders are imported and displayed correctly
- [ ] Check tax calculations match expected values

#### 3. Manual Order Creation
- [ ] Navigate to the order creation form
- [ ] Enter order details including latitude/longitude
- [ ] Submit the form
- [ ] Verify order appears in the order list
- [ ] Confirm tax rate is calculated correctly based on location

#### 4. Tax Jurisdiction Verification

| Location | Coordinates | Expected Tax Rate |
|----------|-------------|-------------------|
| NYC | 40.7128, -74.0060 | NYC tax rate |
| Albany | 42.6526, -73.7562 | Albany tax rate |
| Syracuse | 43.0481, -76.1474 | Syracuse tax rate |
| Yonkers | 40.9312, -73.8987 | Yonkers tax rate |
| Other NY | Any other NY coordinates | General NY state rate |

#### 5. Admin Panel
- [ ] Access the admin/orders page
- [ ] Verify pagination works correctly
- [ ] Test filtering functionality (if implemented)
- [ ] Check order details display correctly

#### 6. Database Verification
```bash
# Connect to the database
docker exec -it postgis psql -U postgres -d delivery_db

# Check orders table
SELECT * FROM orders LIMIT 10;

```

---

## 🚀 Running the Application

### Build and Start
```bash
make build    # Build Docker images
make start    # Start all services
```

### Access Points
- **Frontend:** `http://localhost:10000` (or configured port)
- **Database:** `localhost:5432`

### Stop the Application
```bash
make stop     # Stop and remove containers
```

---

## 📁 Project Structure

```
INT20H/
├── server/              # Backend Express.js server
│   ├── index.js         # Main server entry point
│   └── package.json
├── data/                # Geographic data files
│   └── new-york-counties.geojson
├── init-scripts/        # Database initialization scripts
├── docker-compose.yaml  # Docker services configuration
├── Dockerfile           # Application container
├── Dockerfile.database  # PostGIS database container
├── Makefile             # Build/start/stop commands
├── package.json         # Frontend dependencies
└── vite.config.js       # Vite configuration
```

---

## 🔧 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Application port | `10000` |
| `NODE_ENV` | Environment mode | `production` |
| `DATABASE_URL` | PostgreSQL connection string | `postgres://postgres:root@postgis:5432/delivery_db` |

---

## 📄 License

This is a test task project for BetterMe INT20H program.
