#REST API SALES


## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Setup environment**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Setup database**
   ```bash
   npm run db:create
   npm run db:migrate
   npm run db:seed
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

## Available Scripts

- `npm run dev` - Start development server with nodemon
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors automatically
- `npm run db:create` - Create database
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with sample data
- `npm run db:migrate:undo` - Undo last migration
- `npm run db:seed:undo` - Undo all seeds

## Default Credentials

**Manager Account:**
- Phone: `080000000001`
- Password: `admin123`

## API Endpoints

### Authentication
- `POST /auth/login` - Login with phone and password

### Manager Routes
- `GET /managers/dashboard` - Manager dashboard
- `POST /managers/supervisors` - Create supervisor
- `DELETE /managers/supervisors/:id` - Delete supervisor
- `GET /managers/supervisors` - List supervisors (paginated)
- `GET /managers/sales` - List sales users (paginated)
- `GET /managers/products` - List all products (with filters, pagination, Excel export)

### Supervisor Routes
- `POST /supervisors/sales` - Create sales user
- `DELETE /supervisors/sales/:id` - Delete sales user
- `GET /supervisors/sales` - List sales users in supervisor's store
- `GET /supervisors/products` - List store products (with filters, pagination, Excel export)

### Sales Routes
- `POST /sales/products` - Create product
- `DELETE /sales/products/:id` - Delete product
- `GET /sales/products` - List products (with filters, pagination, ?mine=true, Excel export)

## Excel Export

Add `?export=excel` to any GET /products endpoint to download Excel file:

```bash
# Export all products for manager
GET /managers/products?export=excel

# Export filtered products
GET /managers/products?export=excel&q=iphone&store_id=uuid&created_at_from=2025-01-01

# Export own products for sales
GET /sales/products?export=excel&mine=true
```

## Query Parameters

### Pagination
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10, max: 100)
- `sortBy` - Sort field (default: createdAt)
- `sortOrder` - Sort direction: asc/desc (default: desc)

### Product Filters
- `q` - Search in name, code, notes
- `code` - Exact code match
- `store_id` - Filter by store
- `created_at_from` - Start date (YYYY-MM-DD)
- `created_at_to` - End date (YYYY-MM-DD)
- `creator_id` - Filter by creator
- `mine` - Show only own products (sales only)

## API Documentation

Visit `/docs` for interactive Swagger UI documentation.

## Architecture

```
src/
├── app.js              # Express app configuration
├── server.js           # Server entry point
├── config/             # Configuration files
├── db/                 # Database migrations and seeders
├── models/             # Sequelize models
├── services/           # Business logic layer
├── controllers/        # Request handlers
├── routes/             # Route definitions
├── middlewares/        # Custom middleware
├── utils/              # Utility functions
└── docs/               # API documentation
```

## Error Responses

All errors follow this consistent format:

```json
{
  "success": false,
  "message": "Error description",
  "errors": ["Detailed error messages"],
  "data": null
}
```

## Success Responses

```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

## Pagination Response

```json
{
  "success": true,
  "message": "Data retrieved successfully",
  "data": {
    "items": [...],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 50,
      "itemsPerPage": 10,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```