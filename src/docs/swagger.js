const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Enterprise REST API',
      version: '1.0.0',
      description: 'Production-ready REST API with Express, Sequelize, JWT Auth & Role-based Access Control',
      contact: {
        name: 'API Support',
        email: 'support@enterprise.com',
      },
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production'
          ? 'https://garansiplus.com'
          : 'https://garansiplus.com',
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      parameters: {
        PageParam: {
          in: 'query',
          name: 'page',
          schema: {
            type: 'integer',
            minimum: 1,
            default: 1,
          },
          description: 'Page number',
        },
        LimitParam: {
          in: 'query',
          name: 'limit',
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 10,
          },
          description: 'Number of items per page',
        },
        SortByParam: {
          in: 'query',
          name: 'sortBy',
          schema: {
            type: 'string',
            default: 'createdAt',
          },
          description: 'Field to sort by',
        },
        SortOrderParam: {
          in: 'query',
          name: 'sortOrder',
          schema: {
            type: 'string',
            enum: ['asc', 'desc'],
            default: 'desc',
          },
          description: 'Sort direction',
        },
        SearchParam: {
          in: 'query',
          name: 'q',
          schema: {
            type: 'string',
          },
          description: 'Search in name, code, and notes',
        },
        codeParam: {
          in: 'query',
          name: 'code',
          schema: {
            type: 'string',
          },
          description: 'Filter by exact code',
        },
        StoreIdParam: {
          in: 'query',
          name: 'store_id',
          schema: {
            type: 'string',
            format: 'uuid',
          },
          description: 'Filter by store ID',
        },
        StoreNameParam: {
          in: 'query',
          name: 'store_name',
          schema: {
            type: 'string',
          },
          description: 'Filter by store name (case-insensitive, partial match)',
          example: 'Central',
        },
        CreatedAtFromParam: {
          in: 'query',
          name: 'created_at_from',
          schema: {
            type: 'string',
            format: 'date',
          },
          description: 'Filter by purchase date from (YYYY-MM-DD)',
        },
        CreatedAtToParam: {
          in: 'query',
          name: 'created_at_to',
          schema: {
            type: 'string',
            format: 'date',
          },
          description: 'Filter by purchase date to (YYYY-MM-DD)',
        },
        CreatorIdParam: {
          in: 'query',
          name: 'creator_id',
          schema: {
            type: 'string',
            format: 'uuid',
          },
          description: 'Filter by creator ID',
        },
        MineParam: {
          in: 'query',
          name: 'mine',
          schema: {
            type: 'string',
            enum: ['true', 'false'],
          },
          description: 'Show only own products (sales role only)',
        },
        ExportParam: {
          in: 'query',
          name: 'export',
          schema: {
            type: 'string',
            enum: ['excel'],
          },
          description:
            'Export format (returns .xlsx file instead of JSON). Example request: GET /api/supervisors/products?export=excel&created_at_from=2024-01-01&created_at_to=2024-01-31',
          example: 'excel',
        },
      },
      schemas: {
        // Request Schemas
        LoginRequest: {
          type: 'object',
          required: ['phone', 'password'],
          properties: {
            phone: {
              type: 'string',
              minLength: 10,
              maxLength: 20,
              example: '08114328888',
            },
            password: {
              type: 'string',
              minLength: 6,
              example: 'admin123',
            },
          },
        },
      ForgotPasswordRequest: {
          type: 'object',
          required: ['phone', 'newPassword'],
          properties: {
            phone: {
              type: 'string',
              minLength: 10,
              maxLength: 20,
              example: '08114328888',
            },
            newPassword: {
              type: 'string',
              minLength: 6,
              example: 'newStrongPassword123',
            },
          },
        },
        UpdatePasswordRequest: {
          type: 'object',
          required: ['newPassword'],
          properties: {
            currentPassword: {
              type: 'string',
              minLength: 6,
              nullable: true,
              example: 'oldPassword123',
            },
            newPassword: {
              type: 'string',
              minLength: 6,
              example: 'newSecurePassword123',
            },
          },
        },
        CreateSupervisorRequest: {
          type: 'object',
          required: ['phone', 'password', 'name'],
          properties: {
            phone: {
              type: 'string',
              minLength: 10,
              maxLength: 20,
              example: '080000000010',
            },
            password: {
              type: 'string',
              minLength: 6,
              example: 'supervisor123',
            },
            name: {
              type: 'string',
              minLength: 2,
              maxLength: 100,
              example: 'John Supervisor',
            },
            store: {
              type: 'object',
              description: 'Provide this object to create a brand new store for the supervisor. The API will generate the storeId automatically when this is supplied.',
              required: ['name', 'kode_toko'],
              properties: {
                kode_toko: {
                  type: 'string',
                  pattern: '^[A-Z0-9]+$',
                  example: 'TOKO123',
                  description: 'Unique uppercase alphanumeric store code without spaces.',
                },
                name: {
                  type: 'string',
                  minLength: 2,
                  maxLength: 100,
                  example: 'Central Store',
                },
                address: {
                  type: 'string',
                  nullable: true,
                  example: '123 Main Street, City Center',
                },
                phone: {
                  type: 'string',
                  nullable: true,
                  minLength: 10,
                  maxLength: 20,
                  example: '080123456789',
                },
                email: {
                  type: 'string',
                  nullable: true,
                  example: 'central@store.com',
                },
                isActive: {
                  type: 'boolean',
                  nullable: true,
                  example: true,
                },
              },
            },
          },
        },
        CreateSalesRequest: {
          type: 'object',
          required: ['phone', 'password', 'name'],
          properties: {
            phone: {
              type: 'string',
              minLength: 10,
              maxLength: 20,
              example: '080000000020',
            },
            password: {
              type: 'string',
              minLength: 6,
              example: 'sales123',
            },
            name: {
              type: 'string',
              minLength: 2,
              maxLength: 100,
              example: 'Jane Sales',
            },
          },
        },
        CreateProductRequest: {
          type: 'object',
          required: ['name', 'tipe', 'code', 'price', 'persen'],
          properties: {
            name: {
              type: 'string',
              minLength: 2,
              maxLength: 200,
              example: 'iPhone 15 Pro Max',
            },
            tipe: {
              type: 'string',
              maxLength: 100,
              example: 'SMARTPHONE',
            },
            code: {
              type: 'string',
              minLength: 2,
              maxLength: 50,
              example: 'APPLE-IP15PM-001',
            },
            price: {
              type: 'number',
              format: 'float',
              minimum: 0,
              example: 19990000,
            },
            persen: {
              type: 'integer',
              example: 30,
            },
            notes: {
              type: 'string',
              maxLength: 1000,
              nullable: true,
              example: 'Bundled with free screen protector.',
            },
            customer_name: {
              type: 'string',
              maxLength: 200,
              nullable: true,
              example: 'Adi Nugroho',
            },
            customer_phone: {
              type: 'string',
              maxLength: 50,
              nullable: true,
              example: '081233344455',
            },
            customer_email: {
              type: 'string',
              format: 'email',
              maxLength: 150,
              nullable: true,
              example: 'adi.nugroho@example.com',
            },
          },
        },
        UpdateProductRequest: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              minLength: 2,
              maxLength: 200,
              example: 'iPhone 15 Pro Max',
            },
            tipe: {
              type: 'string',
              maxLength: 100,
              example: 'SMARTPHONE-PRO',
            },
            code: {
              type: 'string',
              minLength: 2,
              maxLength: 50,
              example: 'APPLE-IP15PM-001-UPDATED',
            },
            price: {
              type: 'number',
              format: 'float',
              minimum: 0,
              example: 20990000,
            },
            notes: {
              type: 'string',
              maxLength: 1000,
              example: 'Updated promo price available this month only.',
            },
            persen: {
              type: 'integer',
              example: 25,
            },
            isActive: {
              type: 'boolean',
              example: true,
            },
            customer_name: {
              type: 'string',
              maxLength: 200,
              example: 'Adi Nugroho',
            },
            customer_phone: {
              type: 'string',
              maxLength: 50,
              example: '081233344455',
            },
            customer_email: {
              type: 'string',
              format: 'email',
              maxLength: 150,
              example: 'adi.nugroho@example.com',
            },
          },
        },

        // Response Schemas
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Operation successful',
            },
            data: {
              type: 'object',
              nullable: true,
            },
          },
        },
        SupervisorDeleteProductResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Product deleted successfully',
            },
            data: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                  example: 'Product deleted successfully',
                },
              },
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            message: {
              type: 'string',
              example: 'An error occurred',
            },
            errors: {
              type: 'array',
              items: {
                type: 'string',
              },
              nullable: true,
            },
            data: {
              type: 'object',
              nullable: true,
            },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Login successful',
            },
            data: {
              type: 'object',
              properties: {
                token: {
                  type: 'string',
                  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                },
                user: {
                  $ref: '#/components/schemas/User',
                },
              },
            },
          },
        },
        UpdatePasswordResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Password updated successfully',
            },
            data: {
              $ref: '#/components/schemas/User',
            },
          },
        },
        DashboardResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Dashboard data retrieved successfully',
            },
            data: {
              type: 'object',
              properties: {
                totalStores: {
                  type: 'integer',
                  example: 3,
                },
                totalSupervisors: {
                  type: 'integer',
                  example: 5,
                },
                totalSales: {
                  type: 'integer',
                  example: 15,
                },
                totalProducts: {
                  type: 'integer',
                  example: 150,
                },
              },
            },
          },
        },
        MonthlyProductSummaryResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Monthly product summary retrieved successfully',
            },
            data: {
              type: 'object',
              properties: {
                year: {
                  type: 'integer',
                  example: 2024,
                },
                monthlyProducts: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      month: {
                        type: 'string',
                        example: 'January',
                      },
                      total: {
                        type: 'integer',
                        example: 12,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        UserResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'User retrieved successfully',
            },
            data: {
              $ref: '#/components/schemas/User',
            },
          },
        },
        UsersResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Users retrieved successfully',
            },
            data: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/User',
              },
            },
          },
        },
        PaginatedUsersResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Users retrieved successfully',
            },
            data: {
              type: 'object',
              properties: {
                items: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/User',
                  },
                },
                pagination: {
                  $ref: '#/components/schemas/Pagination',
                },
              },
            },
          },
        },
        ProductResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Product retrieved successfully',
            },
            data: {
              $ref: '#/components/schemas/Product',
            },
          },
        },
        PaginatedProductsResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Products retrieved successfully',
            },
            data: {
              type: 'object',
              properties: {
                items: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/Product',
                  },
                },
                pagination: {
                  $ref: '#/components/schemas/Pagination',
                },
              },
            },
          },
        },

        // Entity Schemas
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
            },
            phone: {
              type: 'string',
              example: '08114328888',
            },
            name: {
              type: 'string',
              example: 'System Manager',
            },
            role: {
              type: 'string',
              enum: ['MANAGER', 'SUPERVISOR', 'SALES', 'SERVICE_CENTER'],
              example: 'MANAGER',
            },
            storeId: {
              type: 'string',
              format: 'uuid',
              nullable: true,
              example: '11111111-1111-1111-1111-111111111111',
            },
            supervisorId: {
              type: 'string',
              format: 'uuid',
              nullable: true,
              example: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
            },
            isActive: {
              type: 'boolean',
              example: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z',
            },
            store: {
              $ref: '#/components/schemas/Store',
            },
            supervisor: {
              $ref: '#/components/schemas/User',
            },
          },
        },
        Store: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '11111111-1111-1111-1111-111111111111',
            },
            kode_toko: {
              type: 'string',
              example: 'TOKO001',
              description: 'Unique uppercase alphanumeric code for the store.',
            },
            name: {
              type: 'string',
              example: 'Main Store',
            },
            address: {
              type: 'string',
              nullable: true,
              example: '123 Main Street, City Center',
            },
            phone: {
              type: 'string',
              nullable: true,
              example: '080111111111',
            },
            email: {
              type: 'string',
              nullable: true,
              example: 'main@store.com',
            },
            isActive: {
              type: 'boolean',
              example: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z',
            },
          },
        },
        Product: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '11111111-1111-1111-1111-111111111111',
            },
            name: {
              type: 'string',
              example: 'iPhone 15 Pro',
            },
            tipe: {
              type: 'string',
              example: 'SMARTPHONE',
            },
            code: {
              type: 'string',
              example: 'APPLE-IP15P-001',
            },
            nomor_kepesertaan: {
              type: 'string',
              example: 'TOKO001-125',
              description: 'Auto-generated membership number per store.',
              readOnly: true,
            },
            price: {
              type: 'number',
              format: 'float',
              example: 19990000,
            },
            priceWarranty: {
              type: 'number',
              format: 'float',
              example: 11994000,
            },
            status: {
              type: 'string',
              example: 'Aktif',
              description: 'Computed product warranty status based on activation and age.',
              readOnly: true,
            },
            persen: {
              type: 'integer',
              example: 60,
            },
            notes: {
              type: 'string',
              nullable: true,
              example: 'Latest iPhone model with titanium design',
            },
            customer_name: {
              type: 'string',
              nullable: true,
              example: 'Adi Nugroho',
            },
            customer_phone: {
              type: 'string',
              nullable: true,
              example: '081233344455',
            },
            customer_email: {
              type: 'string',
              format: 'email',
              nullable: true,
              example: 'adi.nugroho@example.com',
            },
            storeId: {
              type: 'string',
              format: 'uuid',
              example: '11111111-1111-1111-1111-111111111111',
            },
            creatorId: {
              type: 'string',
              format: 'uuid',
              example: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
            },
            isActive: {
              type: 'boolean',
              example: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-01T00:00:00.000Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-05T12:34:56.000Z',
            },
            store: {
              $ref: '#/components/schemas/Store',
            },
            creator: {
              $ref: '#/components/schemas/User',
            },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            currentPage: {
              type: 'integer',
              example: 1,
            },
            totalPages: {
              type: 'integer',
              example: 10,
            },
            totalItems: {
              type: 'integer',
              example: 100,
            },
            itemsPerPage: {
              type: 'integer',
              example: 10,
            },
            hasNextPage: {
              type: 'boolean',
              example: true,
            },
            hasPrevPage: {
              type: 'boolean',
              example: false,
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Authentication',
        description: 'Authentication operations',
      },
      {
        name: 'Manager',
        description: 'Manager operations',
      },
      {
        name: 'Supervisor',
        description: 'Supervisor operations',
      },
      {
        name: 'Sales',
        description: 'Sales operations',
      },
      {
        name: 'Store',
        description: 'Store (Toko) operations',
      },
    ],
  },
  apis: ['./src/routes/*.js'],
};

module.exports = swaggerJsdoc(options);
