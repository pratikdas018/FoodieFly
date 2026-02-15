import express from "express"
import dotenv from "dotenv"
dotenv.config()
import connectDb from "./config/db.js"
import cookieParser from "cookie-parser"
import authRouter from "./routes/auth.routes.js"
import cors from "cors"
import userRouter from "./routes/user.routes.js"

import itemRouter from "./routes/item.routes.js"
import shopRouter from "./routes/shop.routes.js"
import orderRouter from "./routes/order.routes.js"
import adminRouter from "./routes/admin.routes.js"
import http from "http"
import { Server } from "socket.io"
import { socketHandler } from "./socket.js"
import { seedDefaultCoupons } from "./utils/seedCoupons.js"

const app=express()
const server=http.createServer(app)
const defaultFrontendOrigins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "https://food-delivery-vingo-frontend.onrender.com"
]

const configuredOrigins = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || defaultFrontendOrigins.join(","))
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)

const isAllowedOrigin = (origin) => {
    if (!origin) return true
    if (configuredOrigins.includes(origin)) return true
    if (process.env.NODE_ENV !== "production" && /^http:\/\/localhost:\d+$/.test(origin)) return true
    if (process.env.ALLOW_ONRENDER_ORIGINS === "true" && /^https:\/\/.+\.onrender\.com$/.test(origin)) return true
    return false
}

const corsOptions = {
    origin: (origin, callback) => {
        if (isAllowedOrigin(origin)) {
            callback(null, true)
            return
        }
        callback(new Error(`Not allowed by CORS: ${origin}`))
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
}

const io=new Server(server,{
   cors: corsOptions
})

app.set("io",io)



const port=process.env.PORT || 5000
app.use(cors(corsOptions))
app.use(express.json())
app.use(cookieParser())
app.use("/api/auth",authRouter)
app.use("/api/user",userRouter)
app.use("/api/shop",shopRouter)
app.use("/api/item",itemRouter)
app.use("/api/order",orderRouter)
app.use("/api/admin",adminRouter)

socketHandler(io)
server.listen(port, async ()=>{
    await connectDb()
    await seedDefaultCoupons()
    console.log(`server started at ${port}`)
})

