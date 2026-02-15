# FoodieFly

FoodieFly is a real-time food delivery platform built with the MERN stack.
It supports customer ordering, owner operations, delivery workflow, admin management, notifications, chat, scheduling, loyalty, and more.

## Tech Stack

### Frontend
- React (Vite)
- Redux Toolkit
- Tailwind CSS
- Axios
- React Router
- Socket.io client

### Backend
- Node.js
- Express
- MongoDB + Mongoose
- Socket.io
- JWT + cookies
- Nodemailer
- Razorpay
- Multer / Cloudinary

## Key Features
- User, owner, delivery boy, and admin roles
- Restaurant and item management
- Real-time order status + notifications
- Delivery assignment accept/reject flow
- In-app order chat
- Coupons, referral, loyalty points
- Favorites and one-tap reorder
- Scheduled orders (lunch/dinner slots)
- Delivery earnings panel
- Admin panel for users, shops, delivery, disputes

## Project Structure
- `frontend/` React application
- `backend/` Express API + socket server

## Local Setup

### 1. Install dependencies

```bash
npm install --prefix backend
npm install --prefix frontend
```

### 2. Configure environment

#### Backend (`backend/.env`)
Required values:
- `PORT`
- `MONGODB_URL`
- `JWT_SECRET`
- `EMAIL`
- `PASS`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `FRONTEND_URLS`

Example:

```env
PORT=8000
MONGODB_URL=your_mongodb_url
JWT_SECRET=your_jwt_secret
FRONTEND_URLS=http://localhost:5173,http://localhost:5175
```

#### Frontend (`frontend/.env`)
Required values:
- `VITE_FIREBASE_APIKEY`
- `VITE_GEOAPIKEY`
- `VITE_RAZORPAY_KEY_ID`
- `VITE_SERVER_URL` (optional in local, recommended in production)

Example:

```env
VITE_SERVER_URL=http://localhost:8000
```

### 3. Run app

Backend:

```bash
npm --prefix backend run dev
```

Frontend:

```bash
npm --prefix frontend run dev
```

## Demo Data Seeder

FoodieFly includes a demo seeder that creates dummy owners, shops, and food items (with mock ratings and image URLs).

Run:

```bash
npm --prefix backend run seed:demo
```

It seeds:
- 3 demo shops in Baruipur
- 30+ dummy food items
- mock `rating.average` and `rating.count` per item
- owner accounts for each demo shop

Demo owner credentials:
- `demo.owner1@foodiefly.com` / `demo1234`
- `demo.owner2@foodiefly.com` / `demo1234`
- `demo.owner3@foodiefly.com` / `demo1234`

## Deployment Notes (Render)

### Backend
Set:
- `FRONTEND_URLS` to your deployed frontend URL(s)
- `NODE_ENV=production`

### Frontend
Set:
- `VITE_SERVER_URL` to your deployed backend URL

Then redeploy frontend and backend services.

## Scripts

### Backend
- `npm --prefix backend run dev` start API in dev mode
- `npm --prefix backend run seed:demo` seed dummy shops/items/users

### Frontend
- `npm --prefix frontend run dev` start app in dev mode
- `npm --prefix frontend run build` production build
