import express from "express"
import isAuth from "../middlewares/isAuth.js"
import { acceptOrder, createOrderDispute, getAvailableCoupons, getCurrentOrder, getDeliveryBoyAssignment, getDeliveryEarningsPanel, getMyOrders, getOrderById, getOrderChatMessages, getOwnerAnalytics, getTodayDeliveries, placeOrder, previewOrderPricing, rejectOrder, sendDeliveryOtp, sendOrderChatMessage, updateOrderStatus, verifyDeliveryOtp, verifyPayment } from "../controllers/order.controllers.js"




const orderRouter=express.Router()

orderRouter.post("/place-order",isAuth,placeOrder)
orderRouter.post("/verify-payment",isAuth,verifyPayment)
orderRouter.post("/preview-pricing",isAuth,previewOrderPricing)
orderRouter.get("/available-coupons",isAuth,getAvailableCoupons)
orderRouter.get("/my-orders",isAuth,getMyOrders)
orderRouter.get("/owner-analytics",isAuth,getOwnerAnalytics)
orderRouter.get("/get-assignments",isAuth,getDeliveryBoyAssignment)
orderRouter.get("/get-current-order",isAuth,getCurrentOrder)
orderRouter.post("/send-delivery-otp",isAuth,sendDeliveryOtp)
orderRouter.post("/verify-delivery-otp",isAuth,verifyDeliveryOtp)
orderRouter.get("/chat/:orderId/:shopOrderId",isAuth,getOrderChatMessages)
orderRouter.post("/chat/send",isAuth,sendOrderChatMessage)
orderRouter.post("/raise-dispute",isAuth,createOrderDispute)
orderRouter.post("/update-status/:orderId/:shopId",isAuth,updateOrderStatus)
orderRouter.get('/accept-order/:assignmentId',isAuth,acceptOrder)
orderRouter.post('/reject-order/:assignmentId',isAuth,rejectOrder)
orderRouter.get('/get-order-by-id/:orderId',isAuth,getOrderById)
orderRouter.get('/get-today-deliveries',isAuth,getTodayDeliveries)
orderRouter.get('/delivery-earnings-panel',isAuth,getDeliveryEarningsPanel)

export default orderRouter
