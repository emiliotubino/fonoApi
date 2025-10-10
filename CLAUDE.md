# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**fonoApi** is a TypeScript-based Node.js/Express REST API for the fonoApp application. It provides authentication and user management functionality with JWT-based security and MongoDB data persistence.

## Development Commands

### Running the Application
- **Development mode**: `npm run dev` - Runs the server with hot-reload on port 8083 using ts-node-dev
- **Production build**: `npm run build` - Compiles TypeScript to JavaScript in the `dist/` directory
- **Production start**: `npm start` - Runs the compiled application from `dist/index.js`

### Testing
Currently no test suite is configured. The default test command will fail with "Error: no test specified".

## Architecture & Structure

### Core Application Setup (src/index.ts)
The entry point initializes:
1. Express app with CORS and JSON middleware
2. MongoDB connection via `connectDB()`
3. Route registration for `/config`, `/auth`, and `/users` endpoints
4. Server listening on PORT from `.env` (default: 8083)

### Database Layer (src/database/connection.ts)
- Uses Mongoose for MongoDB connection
- Connection string from `MONGO_URI` environment variable (default: `mongodb://localhost:27017/fonoApp`)
- Application exits on connection failure

### Authentication Flow
The API implements a complete JWT-based authentication system:

1. **User Model** (src/models/users.ts):
   - Schema: name, email (unique), password, timestamps
   - Pre-save hook automatically hashes passwords using bcryptjs with salt rounds of 10
   - Instance method `comparePassword()` for password verification
   - Exports `IUser` interface for TypeScript typing

2. **Auth Routes** (src/routes/auth.routes.ts):
   - `POST /auth/login`: Validates credentials, returns JWT token (30-day expiry) and user data
   - `POST /auth/signup`: Creates new user, hashes password, returns JWT token and user data
   - Password hashing happens in TWO places: signup route manually hashes (line 45) AND model pre-save hook also hashes. This means signup passwords are double-hashed, which is a bug.
   - JWT_SECRET from environment variable with fallback to 'chave_secreta'

3. **Auth Middleware** (src/middleware/authMiddleware.ts):
   - Extracts JWT from `Authorization: Bearer <token>` header
   - Verifies token and attaches decoded payload to `req.user`
   - Returns 401 for missing or invalid tokens
   - Exports `AuthRequest` interface extending Express Request with optional `user` property

4. **Protected Routes** (src/routes/user.routes.ts):
   - `GET /users/me`: Returns authenticated user data using authMiddleware
   - Queries MongoDB using user ID from JWT payload

### Environment Variables
Required in `.env`:
- `MONGO_URI`: MongoDB connection string
- `PORT`: Server port (default: 8083)
- `JWT_SECRET`: Secret key for JWT signing

### TypeScript Configuration (tsconfig.json)
- Target: ES2020
- Module: CommonJS
- Strict mode enabled
- Source: `./src`, Output: `./dist`

## Important Notes

### Known Issues
- **Double password hashing bug**: The signup route in `src/routes/auth.routes.ts:45` manually hashes the password with `bcrypt.hash()`, but the User model also has a pre-save hook that hashes passwords. This means signup passwords are hashed twice, while login only compares against the outer hash. This will cause authentication to fail for users created via signup.

### Security Considerations
- JWT tokens have a 30-day expiration
- Passwords are hashed with bcryptjs (salt rounds: 10)
- The default JWT_SECRET fallback ('chave_secreta') should never be used in production
- AuthMiddleware expects tokens in standard Bearer format

### Code Patterns
- Routes are organized by domain: `/auth` for authentication, `/users` for user operations, `/config` for configuration/testing
- All routes follow async/await pattern with try/catch error handling
- Error responses include message and error details (may expose sensitive information in production)
- MongoDB queries use Mongoose models with TypeScript interfaces for type safety
