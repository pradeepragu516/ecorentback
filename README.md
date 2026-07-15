# EcoRent Backend

This is the backend for the EcoRent vehicle rental system, built with Node.js, Express, and MongoDB.

## Features

- User authentication (register, login, JWT)
- Vehicle management (CRUD operations)
- Search and filter vehicles
- Pagination and sorting
- Role-based access control (user/admin)

## Prerequisites

- Node.js (v14 or later)
- npm or yarn
- MongoDB Atlas account

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory with the following variables:
   ```
   PORT=5000
   MONGODB_URI=your_mongodb_atlas_connection_string
   JWT_SECRET=your_jwt_secret_key
   NODE_ENV=development
   ```
4. Start the development server:
   ```bash
   npm run server
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user profile (protected)

### Vehicles
- `GET /api/vehicles` - Get all vehicles (with filtering, sorting, pagination)
- `GET /api/vehicles/:id` - Get single vehicle
- `POST /api/vehicles` - Create new vehicle (admin only)
- `PUT /api/vehicles/:id` - Update vehicle (admin only)
- `DELETE /api/vehicles/:id` - Delete vehicle (admin only)

## Environment Variables

- `PORT` - Server port (default: 5000)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT
- `NODE_ENV` - Application environment (development/production)

## Development

- Use `npm run server` to start the development server with nodemon
- The server will automatically restart when you make changes

## Production

- Set `NODE_ENV=production` in your environment variables
- Run `npm install --production` to install only production dependencies
- Start the server with `npm start`
