import DeliveryAssignment from "../models/deliveryAssignment.model.js"
import Coupon from "../models/coupon.model.js"
import Dispute from "../models/dispute.model.js"
import Item from "../models/item.model.js"
import Order from "../models/order.model.js"
import Shop from "../models/shop.model.js"
import User from "../models/user.model.js"
import { sendDeliveryOtpMail } from "../utils/mail.js"
import RazorPay from "razorpay"
import dotenv from "dotenv"

dotenv.config()
let instance = new RazorPay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const shortOrderId = (id) => String(id || "").slice(-6).toUpperCase()

const buildNotification = ({ type, title, message, route = "/" }) => ({
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    title,
    message,
    route,
    createdAt: new Date().toISOString()
})

const emitNotification = (io, socketId, payload) => {
    if (!io || !socketId) return
    io.to(socketId).emit("notification", payload)
}

const notifyDeliveryPartnersForNewOrder = async (io, order) => {
    try {
        if (!io || !order?.deliveryAddress) return
        const { longitude, latitude } = order.deliveryAddress
        const baseFilter = {
            role: "deliveryBoy",
            accountStatus: "active",
            socketId: { $nin: [null, ""] }
        }

        let deliveryBoys = []
        const hasValidCoordinates = Number.isFinite(Number(longitude)) && Number.isFinite(Number(latitude))
        if (hasValidCoordinates) {
            try {
                deliveryBoys = await User.find({
                    ...baseFilter,
                    location: {
                        $near: {
                            $geometry: { type: "Point", coordinates: [Number(longitude), Number(latitude)] },
                            $maxDistance: 5000
                        }
                    }
                }).select("socketId")
            } catch (geoError) {
                console.log("notifyDeliveryPartnersForNewOrder geo lookup failed", geoError)
            }
        }

        if (deliveryBoys.length === 0) {
            deliveryBoys = await User.find({
                ...baseFilter,
                isOnline: true
            }).select("socketId")
        }

        if (deliveryBoys.length === 0) {
            deliveryBoys = await User.find(baseFilter).select("socketId")
        }

        const emitted = new Set()
        deliveryBoys.forEach((boy) => {
            if (!boy.socketId || emitted.has(boy.socketId)) return
            emitNotification(io, boy.socketId, buildNotification({
                type: "new_order_alert",
                title: "New order nearby",
                message: `A new order #${shortOrderId(order._id)} is available in your area.`,
                route: "/?focus=available-orders"
            }))
            emitted.add(boy.socketId)
        })
    } catch (error) {
        console.log("notifyDeliveryPartnersForNewOrder error", error)
    }
}

const getParticipantRoute = (role, orderId) => {
    if (role === "user") return `/track-order/${orderId}`
    if (role === "owner") return "/my-orders"
    return "/"
}

const isParticipant = (order, shopOrder, userId) => {
    const uid = String(userId)
    return String(order.user) === uid ||
        String(shopOrder.owner) === uid ||
        String(shopOrder.assignedDeliveryBoy || "") === uid
}

const canRaiseDispute = (order, userId) => {
    const uid = String(userId)
    if (String(order.user) === uid) return true
    return (order.shopOrders || []).some((shopOrder) =>
        String(shopOrder.owner) === uid || String(shopOrder.assignedDeliveryBoy || "") === uid
    )
}

const allowedScheduleTypes = ["now", "lunch", "dinner"]
const DELIVERY_FEE_THRESHOLD = 500
const DELIVERY_FEE = 40
const LOYALTY_MAX_DISCOUNT_PERCENT = 0.3
const LOYALTY_EARNING_DIVISOR = 20
const DELIVERY_BASE_PAYOUT_PER_TRIP = 50
const DELIVERY_PEAK_HOUR_BONUS_PER_TRIP = 10
const DELIVERY_VOLUME_INCENTIVE_TIERS = [
    { minTrips: 12, bonus: 220 },
    { minTrips: 8, bonus: 120 },
    { minTrips: 5, bonus: 60 }
]

const roundAmount = (value) => Math.round(Number(value || 0) * 100) / 100

const getDateKey = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
}

const isPeakDeliveryHour = (date) => {
    const hour = new Date(date).getHours()
    return (hour >= 12 && hour < 15) || (hour >= 19 && hour < 23)
}

const calculateDeliveryIncentives = ({ completedTrips = 0, peakTrips = 0 }) => {
    const matchedTier = DELIVERY_VOLUME_INCENTIVE_TIERS.find((tier) => completedTrips >= tier.minTrips)
    const volumeBonus = Number(matchedTier?.bonus || 0)
    const peakHourBonus = Math.max(0, Number(peakTrips || 0) * DELIVERY_PEAK_HOUR_BONUS_PER_TRIP)
    const total = volumeBonus + peakHourBonus
    return {
        volumeBonus,
        peakHourBonus,
        total
    }
}

const calculateDeliveryPayout = ({ completedTrips = 0, peakTrips = 0 }) => {
    const basePayout = roundAmount(completedTrips * DELIVERY_BASE_PAYOUT_PER_TRIP)
    const incentives = calculateDeliveryIncentives({ completedTrips, peakTrips })
    const totalPayout = roundAmount(basePayout + incentives.total)
    return {
        completedTrips,
        basePayout,
        incentives,
        totalPayout
    }
}

const calculateCartSubtotal = (cartItems = []) => {
    return roundAmount(cartItems.reduce((sum, item) => sum + Number(item?.price || 0) * Number(item?.quantity || 0), 0))
}

const calculateDeliveryFee = (subtotal) => subtotal > DELIVERY_FEE_THRESHOLD ? 0 : DELIVERY_FEE

const validateCartItemsAvailability = async (cartItems = []) => {
    const itemIds = [...new Set(cartItems.map((item) => String(item?.id || "")).filter(Boolean))]
    if (itemIds.length === 0) {
        return { ok: false, message: "invalid cart items" }
    }
    const items = await Item.find({ _id: { $in: itemIds } }).select("_id inStock shop name")
    const itemMap = new Map(items.map((item) => [String(item._id), item]))

    for (const cartItem of cartItems) {
        const itemId = String(cartItem?.id || "")
        const dbItem = itemMap.get(itemId)
        if (!dbItem) {
            return { ok: false, message: "some items are no longer available" }
        }
        if (!dbItem.inStock) {
            return { ok: false, message: `${dbItem.name} is currently out of stock` }
        }
        if (String(dbItem.shop) !== String(cartItem?.shop || "")) {
            return { ok: false, message: "invalid cart item shop mapping" }
        }
    }
    return { ok: true }
}

const normalizeCouponCode = (couponCode) => String(couponCode || "").trim().toUpperCase()

const calculateCouponDiscount = (coupon, amount) => {
    if (!coupon) return 0
    let discount = 0
    if (coupon.discountType === "percent") {
        discount = (amount * Number(coupon.discountValue || 0)) / 100
        if (coupon.maxDiscount != null) {
            discount = Math.min(discount, Number(coupon.maxDiscount))
        }
    } else {
        discount = Number(coupon.discountValue || 0)
    }
    return roundAmount(Math.max(0, Math.min(discount, amount)))
}

const getCouponUsageByUser = (coupon, userId) => {
    if (!coupon?.usage?.length) return 0
    const usageEntry = coupon.usage.find((entry) => String(entry.user) === String(userId))
    return usageEntry ? Number(usageEntry.count || 0) : 0
}

const calculateOrderPricing = async ({ userId, cartItems, scheduleType, couponCode, loyaltyPointsToUse }) => {
    if (!Array.isArray(cartItems) || cartItems.length === 0) {
        return { error: "cart is empty" }
    }
    const stockValidation = await validateCartItemsAvailability(cartItems)
    if (!stockValidation.ok) {
        return { error: stockValidation.message }
    }
    const shopIds = [...new Set(cartItems.map((item) => String(item?.shop || "")).filter(Boolean))]
    if (shopIds.length > 0) {
        const suspendedShopCount = await Shop.countDocuments({
            _id: { $in: shopIds },
            adminStatus: "suspended"
        })
        if (suspendedShopCount > 0) {
            return { error: "one or more shops are currently unavailable" }
        }
    }
    if (!allowedScheduleTypes.includes(scheduleType)) {
        return { error: "invalid scheduleType" }
    }

    const user = await User.findById(userId).select("loyaltyPoints")
    if (!user) {
        return { error: "user not found" }
    }

    const subtotalAmount = calculateCartSubtotal(cartItems)
    if (subtotalAmount <= 0) {
        return { error: "invalid cart amount" }
    }

    const deliveryFee = calculateDeliveryFee(subtotalAmount)
    const grossAmount = roundAmount(subtotalAmount + deliveryFee)

    const normalizedCouponCode = normalizeCouponCode(couponCode)
    let coupon = null
    let couponDiscount = 0

    if (normalizedCouponCode) {
        coupon = await Coupon.findOne({ code: normalizedCouponCode, active: true })
        if (!coupon) {
            return { error: "invalid coupon code" }
        }
        if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
            return { error: "coupon has expired" }
        }
        if (Number(coupon.minOrderAmount || 0) > grossAmount) {
            return { error: `minimum order for this coupon is INR ${coupon.minOrderAmount}` }
        }
        if (Array.isArray(coupon.validScheduleTypes) && coupon.validScheduleTypes.length > 0 && !coupon.validScheduleTypes.includes(scheduleType)) {
            return { error: `coupon is valid only for ${coupon.validScheduleTypes.join(", ")} orders` }
        }
        const usageCount = getCouponUsageByUser(coupon, userId)
        if (usageCount >= Number(coupon.usageLimitPerUser || 1)) {
            return { error: "coupon usage limit reached" }
        }
        couponDiscount = calculateCouponDiscount(coupon, grossAmount)
    }

    const requestedLoyaltyPoints = Math.max(0, Math.floor(Number(loyaltyPointsToUse || 0)))
    const availablePoints = Math.max(0, Math.floor(Number(user.loyaltyPoints || 0)))
    const maxAmountAfterCoupon = Math.max(0, roundAmount(grossAmount - couponDiscount))
    const maxByPolicy = Math.floor(maxAmountAfterCoupon * LOYALTY_MAX_DISCOUNT_PERCENT)
    const loyaltyPointsUsed = Math.min(requestedLoyaltyPoints, availablePoints, maxByPolicy, Math.floor(maxAmountAfterCoupon))
    const loyaltyDiscount = roundAmount(loyaltyPointsUsed)

    const totalAmount = roundAmount(Math.max(0, grossAmount - couponDiscount - loyaltyDiscount))
    const loyaltyPointsEarned = totalAmount > 0 ? Math.max(1, Math.floor(totalAmount / LOYALTY_EARNING_DIVISOR)) : 0

    return {
        subtotalAmount,
        deliveryFee,
        grossAmount,
        couponCode: normalizedCouponCode,
        couponDiscount,
        loyaltyPointsUsed,
        loyaltyDiscount,
        loyaltyPointsEarned,
        totalAmount
    }
}

const applyOrderBenefits = async (order) => {
    if (!order || order.benefitsApplied) return

    const user = await User.findById(order.user).select("loyaltyPoints lifetimeLoyaltyPoints")
    if (user) {
        const usedPoints = Math.max(0, Math.floor(Number(order.loyaltyPointsUsed || 0)))
        const earnedPoints = Math.max(0, Math.floor(Number(order.loyaltyPointsEarned || 0)))
        const currentPoints = Math.max(0, Math.floor(Number(user.loyaltyPoints || 0)))
        user.loyaltyPoints = Math.max(0, currentPoints - usedPoints) + earnedPoints
        user.lifetimeLoyaltyPoints = Math.max(0, Math.floor(Number(user.lifetimeLoyaltyPoints || 0))) + earnedPoints
        await user.save()
    }

    if (order.couponCode) {
        const coupon = await Coupon.findOne({ code: order.couponCode })
        if (coupon) {
            const existingUsage = coupon.usage.find((entry) => String(entry.user) === String(order.user))
            if (existingUsage) {
                existingUsage.count = Number(existingUsage.count || 0) + 1
            } else {
                coupon.usage.push({ user: order.user, count: 1 })
            }
            await coupon.save()
        }
    }

    order.benefitsApplied = true
    await order.save()
}

export const previewOrderPricing = async (req, res) => {
    try {
        const { cartItems = [], scheduleType = "now", couponCode = "", loyaltyPointsToUse = 0 } = req.body
        const pricing = await calculateOrderPricing({
            userId: req.userId,
            cartItems,
            scheduleType,
            couponCode,
            loyaltyPointsToUse
        })
        if (pricing.error) {
            return res.status(400).json({ message: pricing.error })
        }
        return res.status(200).json(pricing)
    } catch (error) {
        return res.status(500).json({ message: `preview pricing error ${error}` })
    }
}

export const getAvailableCoupons = async (req, res) => {
    try {
        const coupons = await Coupon.find({
            active: true,
            $or: [
                { expiresAt: null },
                { expiresAt: { $gte: new Date() } }
            ]
        }).select("code title description discountType discountValue maxDiscount minOrderAmount validScheduleTypes usageLimitPerUser usage")

        const response = coupons.map((coupon) => {
            const usageCount = getCouponUsageByUser(coupon, req.userId)
            const limit = Number(coupon.usageLimitPerUser || 1)
            return {
                _id: coupon._id,
                code: coupon.code,
                title: coupon.title,
                description: coupon.description,
                discountType: coupon.discountType,
                discountValue: coupon.discountValue,
                maxDiscount: coupon.maxDiscount,
                minOrderAmount: coupon.minOrderAmount,
                validScheduleTypes: coupon.validScheduleTypes,
                usageLimitPerUser: limit,
                remainingUses: Math.max(0, limit - usageCount)
            }
        })
        return res.status(200).json(response)
    } catch (error) {
        return res.status(500).json({ message: `get coupons error ${error}` })
    }
}

export const placeOrder = async (req, res) => {
    try {
        const {
            cartItems,
            paymentMethod,
            deliveryAddress,
            scheduleType = "now",
            scheduledFor = null,
            couponCode = "",
            loyaltyPointsToUse = 0
        } = req.body
        if (!Array.isArray(cartItems) || cartItems.length === 0) {
            return res.status(400).json({ message: "cart is empty" })
        }
        if (!deliveryAddress.text || !deliveryAddress.latitude || !deliveryAddress.longitude) {
            return res.status(400).json({ message: "send complete deliveryAddress" })
        }

        if (!allowedScheduleTypes.includes(scheduleType)) {
            return res.status(400).json({ message: "invalid scheduleType" })
        }

        let scheduledDate = null
        if (scheduleType !== "now") {
            if (!scheduledFor) {
                return res.status(400).json({ message: "scheduledFor is required for scheduled orders" })
            }
            scheduledDate = new Date(scheduledFor)
            if (Number.isNaN(scheduledDate.getTime())) {
                return res.status(400).json({ message: "invalid scheduledFor" })
            }
            if (scheduledDate <= new Date()) {
                return res.status(400).json({ message: "scheduledFor must be in the future" })
            }
        }

        const pricing = await calculateOrderPricing({
            userId: req.userId,
            cartItems,
            scheduleType,
            couponCode,
            loyaltyPointsToUse
        })
        if (pricing.error) {
            return res.status(400).json({ message: pricing.error })
        }

        const groupItemsByShop = {}

        cartItems.forEach(item => {
            const shopId = item.shop
            if (!groupItemsByShop[shopId]) {
                groupItemsByShop[shopId] = []
            }
            groupItemsByShop[shopId].push(item)
        });

        const shopOrders = await Promise.all(Object.keys(groupItemsByShop).map(async (shopId) => {
            const shop = await Shop.findById(shopId).populate("owner")
            if (!shop) {
                throw new Error("shop not found")
            }
            if (shop.adminStatus === "suspended") {
                throw new Error("shop is suspended by admin")
            }
            const items = groupItemsByShop[shopId]
            const subtotal = items.reduce((sum, i) => sum + Number(i.price) * Number(i.quantity), 0)
            return {
                shop: shop._id,
                owner: shop.owner._id,
                subtotal,
                shopOrderItems: items.map((i) => ({
                    item: i.id,
                    price: i.price,
                    quantity: i.quantity,
                    name: i.name
                }))
            }
        }
        ))

        const orderPayload = {
            user: req.userId,
            paymentMethod,
            deliveryAddress,
            subtotalAmount: pricing.subtotalAmount,
            deliveryFee: pricing.deliveryFee,
            grossAmount: pricing.grossAmount,
            couponCode: pricing.couponCode,
            couponDiscount: pricing.couponDiscount,
            loyaltyPointsUsed: pricing.loyaltyPointsUsed,
            loyaltyDiscount: pricing.loyaltyDiscount,
            loyaltyPointsEarned: pricing.loyaltyPointsEarned,
            totalAmount: pricing.totalAmount,
            scheduleType,
            scheduledFor: scheduledDate,
            shopOrders
        }

        if (paymentMethod == "online") {
            if (pricing.totalAmount <= 0) {
                return res.status(400).json({ message: "online payment requires amount greater than zero" })
            }
            const razorOrder = await instance.orders.create({
                amount: Math.round(pricing.totalAmount * 100),
                currency: 'INR',
                receipt: `receipt_${Date.now()}`
            })
            const newOrder = await Order.create({
                ...orderPayload,
                razorpayOrderId: razorOrder.id,
                payment: false
            })

            return res.status(200).json({
                razorOrder,
                orderId: newOrder._id,
            })

        }

        const newOrder = await Order.create(orderPayload)
        await applyOrderBenefits(newOrder)

        await newOrder.populate("shopOrders.shopOrderItems.item", "name image price")
        await newOrder.populate("shopOrders.shop", "name")
        await newOrder.populate("shopOrders.owner", "fullName socketId")
        await newOrder.populate("user", "fullName email mobile")

        const io = req.app.get('io')

        if (io) {
            newOrder.shopOrders.forEach(shopOrder => {
                const ownerSocketId = shopOrder.owner.socketId
                if (ownerSocketId) {
                    io.to(ownerSocketId).emit('newOrder', {
                        _id: newOrder._id,
                        paymentMethod: newOrder.paymentMethod,
                        user: newOrder.user,
                        shopOrders: shopOrder,
                        createdAt: newOrder.createdAt,
                        deliveryAddress: newOrder.deliveryAddress,
                        payment: newOrder.payment
                    })
                    emitNotification(io, ownerSocketId, buildNotification({
                        type: "new_order",
                        title: "New order received",
                        message: `Order #${shortOrderId(newOrder._id)} is placed for your shop.`,
                        route: "/my-orders"
                    }))
                }
            });
            await notifyDeliveryPartnersForNewOrder(io, newOrder)
        }



        return res.status(201).json(newOrder)
    } catch (error) {
        if (String(error).includes("shop not found")) {
            return res.status(400).json({ message: "shop not found" })
        }
        if (String(error).includes("shop is suspended by admin")) {
            return res.status(400).json({ message: "one or more shops are currently unavailable" })
        }
        return res.status(500).json({ message: `place order error ${error}` })
    }
}

export const createOrderDispute = async (req, res) => {
    try {
        const { orderId, shopOrderId = null, reason, description = "", priority = "medium" } = req.body
        const trimmedReason = String(reason || "").trim()
        const trimmedDescription = String(description || "").trim()

        if (!orderId || trimmedReason.length < 3) {
            return res.status(400).json({ message: "orderId and valid reason are required" })
        }
        if (!["low", "medium", "high"].includes(priority)) {
            return res.status(400).json({ message: "invalid priority" })
        }

        const [order, raisedBy] = await Promise.all([
            Order.findById(orderId),
            User.findById(req.userId).select("role fullName")
        ])
        if (!order) {
            return res.status(400).json({ message: "order not found" })
        }
        if (!raisedBy || !["user", "owner", "deliveryBoy"].includes(raisedBy.role)) {
            return res.status(403).json({ message: "only user, owner or delivery boy can raise disputes" })
        }

        let selectedShopOrderId = null
        if (shopOrderId) {
            const selectedShopOrder = order.shopOrders.id(shopOrderId)
            if (!selectedShopOrder) {
                return res.status(400).json({ message: "shop order not found" })
            }
            if (!isParticipant(order, selectedShopOrder, req.userId)) {
                return res.status(403).json({ message: "you are not allowed to raise this dispute" })
            }
            selectedShopOrderId = selectedShopOrder._id
        } else if (!canRaiseDispute(order, req.userId)) {
            return res.status(403).json({ message: "you are not allowed to raise this dispute" })
        }

        const existingOpen = await Dispute.findOne({
            order: order._id,
            shopOrderId: selectedShopOrderId,
            raisedBy: req.userId,
            status: { $in: ["open", "in_review"] }
        })
        if (existingOpen) {
            return res.status(400).json({ message: "you already have an active dispute for this order" })
        }

        const dispute = await Dispute.create({
            order: order._id,
            shopOrderId: selectedShopOrderId,
            raisedBy: req.userId,
            raisedByRole: raisedBy.role,
            reason: trimmedReason,
            description: trimmedDescription,
            priority
        })

        const io = req.app.get("io")
        const admins = await User.find({
            role: "admin",
            accountStatus: "active",
            socketId: { $ne: null }
        }).select("socketId")

        admins.forEach((admin) => {
            emitNotification(io, admin.socketId, buildNotification({
                type: "new_dispute",
                title: "New dispute raised",
                message: `${raisedBy.fullName} raised a dispute for order #${shortOrderId(order._id)}.`,
                route: "/admin"
            }))
        })

        return res.status(201).json({
            message: "dispute created",
            dispute
        })
    } catch (error) {
        return res.status(500).json({ message: `create dispute error ${error}` })
    }
}

export const verifyPayment = async (req, res) => {
    try {
        const { razorpay_payment_id, orderId } = req.body
        const payment = await instance.payments.fetch(razorpay_payment_id)
        if (!payment || payment.status != "captured") {
            return res.status(400).json({ message: "payment not captured" })
        }
        const order = await Order.findById(orderId)
        if (!order) {
            return res.status(400).json({ message: "order not found" })
        }

        order.payment = true
        order.razorpayPaymentId = razorpay_payment_id
        await order.save()
        await applyOrderBenefits(order)

        await order.populate("shopOrders.shopOrderItems.item", "name image price")
        await order.populate("shopOrders.shop", "name")
        await order.populate("shopOrders.owner", "fullName socketId")
        await order.populate("user", "fullName email mobile")

        const io = req.app.get('io')

        if (io) {
            order.shopOrders.forEach(shopOrder => {
                const ownerSocketId = shopOrder.owner.socketId
                if (ownerSocketId) {
                    io.to(ownerSocketId).emit('newOrder', {
                        _id: order._id,
                        paymentMethod: order.paymentMethod,
                        user: order.user,
                        shopOrders: shopOrder,
                        createdAt: order.createdAt,
                        deliveryAddress: order.deliveryAddress,
                        payment: order.payment
                    })
                    emitNotification(io, ownerSocketId, buildNotification({
                        type: "new_order",
                        title: "New paid order received",
                        message: `Order #${shortOrderId(order._id)} payment is confirmed.`,
                        route: "/my-orders"
                    }))
                }
            });
            await notifyDeliveryPartnersForNewOrder(io, order)
        }


        return res.status(200).json(order)

    } catch (error) {
        return res.status(500).json({ message: `verify payment  error ${error}` })
    }
}

export const getOwnerAnalytics = async (req, res) => {
    try {
        const user = await User.findById(req.userId).select("role")
        if (!user || user.role !== "owner") {
            return res.status(403).json({ message: "only owner can access analytics" })
        }

        const orders = await Order.find({ "shopOrders.owner": req.userId })
            .select("createdAt shopOrders")
            .populate("shopOrders.shopOrderItems.item", "name")
            .lean()

        const summary = {
            totalOrders: 0,
            deliveredOrders: 0,
            cancelledOrders: 0,
            grossSales: 0,
            deliveredSales: 0,
            conversionRate: 0,
            cancellationRate: 0,
            averageDeliveredOrderValue: 0
        }

        const hourlyMap = {}
        for (let hour = 0; hour < 24; hour += 1) {
            hourlyMap[hour] = { hour, sales: 0, orders: 0 }
        }

        const topItemsMap = new Map()

        orders.forEach((order) => {
            const ownerShopOrders = (order.shopOrders || []).filter(
                (shopOrder) => String(shopOrder.owner) === String(req.userId)
            )

            ownerShopOrders.forEach((shopOrder) => {
                summary.totalOrders += 1

                if (shopOrder.status === "delivered") {
                    summary.deliveredOrders += 1
                    summary.deliveredSales += Number(shopOrder.subtotal || 0)
                }
                if (shopOrder.status === "cancelled") {
                    summary.cancelledOrders += 1
                } else {
                    summary.grossSales += Number(shopOrder.subtotal || 0)
                }

                const saleDate = shopOrder.deliveredAt ? new Date(shopOrder.deliveredAt) : new Date(order.createdAt)
                if (!Number.isNaN(saleDate.getTime())) {
                    const hour = saleDate.getHours()
                    hourlyMap[hour].orders += 1
                    if (shopOrder.status !== "cancelled") {
                        hourlyMap[hour].sales += Number(shopOrder.subtotal || 0)
                    }
                }

                ;(shopOrder.shopOrderItems || []).forEach((lineItem) => {
                    const itemId = String(lineItem.item?._id || lineItem.item || "")
                    const itemName = lineItem.item?.name || lineItem.name || "Item"
                    const quantity = Number(lineItem.quantity || 0)
                    const revenue = Number(lineItem.price || 0) * quantity
                    if (!itemId) return

                    const existing = topItemsMap.get(itemId) || {
                        itemId,
                        name: itemName,
                        quantity: 0,
                        revenue: 0
                    }
                    existing.quantity += quantity
                    if (shopOrder.status !== "cancelled") {
                        existing.revenue += revenue
                    }
                    topItemsMap.set(itemId, existing)
                })
            })
        })

        summary.conversionRate = summary.totalOrders > 0
            ? roundAmount((summary.deliveredOrders / summary.totalOrders) * 100)
            : 0
        summary.cancellationRate = summary.totalOrders > 0
            ? roundAmount((summary.cancelledOrders / summary.totalOrders) * 100)
            : 0
        summary.averageDeliveredOrderValue = summary.deliveredOrders > 0
            ? roundAmount(summary.deliveredSales / summary.deliveredOrders)
            : 0
        summary.grossSales = roundAmount(summary.grossSales)
        summary.deliveredSales = roundAmount(summary.deliveredSales)

        const hourlySales = Object.values(hourlyMap).map((entry) => ({
            hour: entry.hour,
            sales: roundAmount(entry.sales),
            orders: entry.orders
        }))

        const topItems = Array.from(topItemsMap.values())
            .sort((a, b) => {
                if (b.quantity !== a.quantity) return b.quantity - a.quantity
                return b.revenue - a.revenue
            })
            .slice(0, 8)
            .map((item) => ({
                ...item,
                revenue: roundAmount(item.revenue)
            }))

        return res.status(200).json({
            summary,
            topItems,
            hourlySales
        })
    } catch (error) {
        return res.status(500).json({ message: `owner analytics error ${error}` })
    }
}



export const getMyOrders = async (req, res) => {
    try {
        const user = await User.findById(req.userId)
        if (user.role == "user") {
            const orders = await Order.find({ user: req.userId })
                .sort({ createdAt: -1 })
                .populate("shopOrders.shop", "name")
                .populate("shopOrders.owner", "name email mobile")
                .populate("shopOrders.shopOrderItems.item", "name image price")

            return res.status(200).json(orders)
        } else if (user.role == "owner") {
            const orders = await Order.find({ "shopOrders.owner": req.userId })
                .sort({ createdAt: -1 })
                .populate("shopOrders.shop", "name")
                .populate("user")
                .populate("shopOrders.shopOrderItems.item", "name image price")
                .populate("shopOrders.assignedDeliveryBoy", "fullName mobile")



            const filteredOrders = orders.map((order => ({
                _id: order._id,
                paymentMethod: order.paymentMethod,
                scheduleType: order.scheduleType,
                scheduledFor: order.scheduledFor,
                user: order.user,
                shopOrders: order.shopOrders.find(o => o.owner._id == req.userId),
                createdAt: order.createdAt,
                deliveryAddress: order.deliveryAddress,
                payment: order.payment
            })))


            return res.status(200).json(filteredOrders)
        } else if (user.role == "deliveryBoy") {
            const orders = await Order.find({ "shopOrders.assignedDeliveryBoy": req.userId })
                .sort({ createdAt: -1 })
                .populate("shopOrders.shop", "name")
                .populate("shopOrders.owner", "fullName email mobile")
                .populate("shopOrders.shopOrderItems.item", "name image price")
                .populate("shopOrders.assignedDeliveryBoy", "fullName email mobile")
                .populate("user", "fullName email mobile")

            const filteredOrders = []

            orders.forEach((order) => {
                order.shopOrders.forEach((shopOrder) => {
                    const assignedId = shopOrder.assignedDeliveryBoy?._id || shopOrder.assignedDeliveryBoy
                    if (String(assignedId) === String(req.userId)) {
                        filteredOrders.push({
                            _id: order._id,
                            paymentMethod: order.paymentMethod,
                            payment: order.payment,
                            scheduleType: order.scheduleType,
                            scheduledFor: order.scheduledFor,
                            createdAt: order.createdAt,
                            deliveryAddress: order.deliveryAddress,
                            totalAmount: order.totalAmount,
                            user: order.user,
                            shopOrder
                        })
                    }
                })
            })

            return res.status(200).json(filteredOrders)
        }
        return res.status(403).json({ message: "my-orders is not available for this role" })

    } catch (error) {
        return res.status(500).json({ message: `get User order error ${error}` })
    }
}


export const updateOrderStatus = async (req, res) => {
    try {
        const { orderId, shopId } = req.params
        const { status } = req.body
        const order = await Order.findById(orderId)

        const shopOrder = order.shopOrders.find(o => o.shop == shopId)
        if (!shopOrder) {
            return res.status(400).json({ message: "shop order not found" })
        }
        shopOrder.status = status

        if (status === "cancelled") {
            if (shopOrder.assignment) {
                await DeliveryAssignment.deleteOne({ _id: shopOrder.assignment })
            }
            shopOrder.assignment = null
            shopOrder.assignedDeliveryBoy = null
            shopOrder.deliveryOtp = null
            shopOrder.otpExpires = null
        }

        let deliveryBoysPayload = []
        if (status == "out of delivery" && !shopOrder.assignment) {
            const { longitude, latitude } = order.deliveryAddress
            const nearByDeliveryBoys = await User.find({
                role: "deliveryBoy",
                location: {
                    $near: {
                        $geometry: { type: "Point", coordinates: [Number(longitude), Number(latitude)] },
                        $maxDistance: 5000
                    }
                }
            })

            const nearByIds = nearByDeliveryBoys.map(b => b._id)
            const busyIds = await DeliveryAssignment.find({
                assignedTo: { $in: nearByIds },
                status: { $nin: ["brodcasted", "completed"] }

            }).distinct("assignedTo")

            const busyIdSet = new Set(busyIds.map(id => String(id)))

            const availableBoys = nearByDeliveryBoys.filter(b => !busyIdSet.has(String(b._id)))
            const candidates = availableBoys.map(b => b._id)

            if (candidates.length == 0) {
                await order.save()
                return res.json({
                    message: "order status updated but there is no available delivery boys"
                })
            }

            const deliveryAssignment = await DeliveryAssignment.create({
                order: order?._id,
                shop: shopOrder.shop,
                shopOrderId: shopOrder?._id,
                brodcastedTo: candidates,
                status: "brodcasted"
            })

            shopOrder.assignedDeliveryBoy = deliveryAssignment.assignedTo
            shopOrder.assignment = deliveryAssignment._id
            deliveryBoysPayload = availableBoys.map(b => ({
                id: b._id,
                fullName: b.fullName,
                longitude: b.location.coordinates?.[0],
                latitude: b.location.coordinates?.[1],
                mobile: b.mobile
            }))

            await deliveryAssignment.populate('order')
            await deliveryAssignment.populate('shop')
            const io = req.app.get('io')
            if (io) {
                availableBoys.forEach(boy => {
                    const boySocketId = boy.socketId
                    if (boySocketId) {
                        io.to(boySocketId).emit('newAssignment', {
                            sentTo:boy._id,
                            assignmentId: deliveryAssignment._id,
                            orderId: deliveryAssignment.order._id,
                            shopName: deliveryAssignment.shop.name,
                            deliveryAddress: deliveryAssignment.order.deliveryAddress,
                            items: deliveryAssignment.order.shopOrders.find(so => so._id.equals(deliveryAssignment.shopOrderId)).shopOrderItems || [],
                            subtotal: deliveryAssignment.order.shopOrders.find(so => so._id.equals(deliveryAssignment.shopOrderId))?.subtotal
                        })
                        emitNotification(io, boySocketId, buildNotification({
                            type: "delivery_assignment",
                            title: "New delivery request",
                            message: `You have a new assignment from ${deliveryAssignment.shop.name}.`,
                            route: "/"
                        }))
                    }
                });
            }





        }


        await order.save()
        const updatedShopOrder = order.shopOrders.find(o => o.shop == shopId)
        await order.populate("shopOrders.shop", "name")
        await order.populate("shopOrders.assignedDeliveryBoy", "fullName email mobile")
        await order.populate("user", "socketId")

        const io = req.app.get('io')
        if (io) {
            const userSocketId = order.user.socketId
            if (userSocketId) {
                io.to(userSocketId).emit('update-status', {
                    orderId: order._id,
                    shopId: updatedShopOrder.shop._id,
                    status: updatedShopOrder.status,
                    userId: order.user._id
                })
                emitNotification(io, userSocketId, buildNotification({
                    type: "order_status",
                    title: "Order status updated",
                    message: `Order #${shortOrderId(order._id)} is now ${updatedShopOrder.status}.`,
                    route: `/track-order/${order._id}`
                }))
            }
        }



        return res.status(200).json({
            shopOrder: updatedShopOrder,
            assignedDeliveryBoy: updatedShopOrder?.assignedDeliveryBoy,
            availableBoys: deliveryBoysPayload,
            assignment: updatedShopOrder?.assignment?._id

        })



    } catch (error) {
        return res.status(500).json({ message: `order status error ${error}` })
    }
}


export const getDeliveryBoyAssignment = async (req, res) => {
    try {
        const deliveryBoyId = req.userId
        const assignments = await DeliveryAssignment.find({
            brodcastedTo: deliveryBoyId,
            declinedBy: { $ne: deliveryBoyId },
            status: "brodcasted"
        })
            .populate("order")
            .populate("shop")

        const formated = assignments.map(a => ({
            assignmentId: a._id,
            orderId: a.order._id,
            shopName: a.shop.name,
            deliveryAddress: a.order.deliveryAddress,
            items: a.order.shopOrders.find(so => so._id.equals(a.shopOrderId)).shopOrderItems || [],
            subtotal: a.order.shopOrders.find(so => so._id.equals(a.shopOrderId))?.subtotal
        }))

        return res.status(200).json(formated)
    } catch (error) {
        return res.status(500).json({ message: `get Assignment error ${error}` })
    }
}

export const rejectOrder = async (req, res) => {
    try {
        const { assignmentId } = req.params
        const assignment = await DeliveryAssignment.findById(assignmentId)
        if (!assignment) {
            return res.status(400).json({ message: "assignment not found" })
        }
        if (assignment.status !== "brodcasted") {
            return res.status(400).json({ message: "assignment is no longer available" })
        }
        if (!assignment.brodcastedTo.some((id) => String(id) === String(req.userId))) {
            return res.status(403).json({ message: "you are not allowed to reject this assignment" })
        }
        if (assignment.declinedBy?.some((id) => String(id) === String(req.userId))) {
            return res.status(200).json({ message: "assignment already rejected" })
        }

        assignment.declinedBy.push(req.userId)
        await assignment.save()

        return res.status(200).json({ message: "assignment rejected" })
    } catch (error) {
        return res.status(500).json({ message: `reject order error ${error}` })
    }
}


export const acceptOrder = async (req, res) => {
    try {
        const { assignmentId } = req.params
        const assignment = await DeliveryAssignment.findById(assignmentId)
        if (!assignment) {
            return res.status(400).json({ message: "assignment not found" })
        }
        if (assignment.status !== "brodcasted") {
            return res.status(400).json({ message: "assignment is expired" })
        }

        const alreadyAssigned = await DeliveryAssignment.findOne({
            assignedTo: req.userId,
            status: { $nin: ["brodcasted", "completed"] }
        })

        if (alreadyAssigned) {
            return res.status(400).json({ message: "You are already assigned to another order" })
        }

        assignment.assignedTo = req.userId
        assignment.status = 'assigned'
        assignment.acceptedAt = new Date()
        await assignment.save()

        const order = await Order.findById(assignment.order)
        if (!order) {
            return res.status(400).json({ message: "order not found" })
        }

        let shopOrder = order.shopOrders.id(assignment.shopOrderId)
        shopOrder.assignedDeliveryBoy = req.userId
        await order.save()

        const deliveryBoy = await User.findById(req.userId).select("fullName socketId")
        const owner = await User.findById(shopOrder.owner).select("socketId")
        const customer = await User.findById(order.user).select("socketId")
        const io = req.app.get("io")

        emitNotification(io, deliveryBoy?.socketId, buildNotification({
            type: "assignment_accepted",
            title: "Order accepted",
            message: `You accepted order #${shortOrderId(order._id)}.`,
            route: "/"
        }))
        emitNotification(io, owner?.socketId, buildNotification({
            type: "delivery_assigned",
            title: "Delivery boy assigned",
            message: `${deliveryBoy?.fullName || "Delivery partner"} accepted order #${shortOrderId(order._id)}.`,
            route: "/my-orders"
        }))
        emitNotification(io, customer?.socketId, buildNotification({
            type: "delivery_assigned",
            title: "Delivery partner assigned",
            message: `${deliveryBoy?.fullName || "Delivery partner"} is now delivering your order.`,
            route: `/track-order/${order._id}`
        }))


        return res.status(200).json({
            message: 'order accepted'
        })
    } catch (error) {
        return res.status(500).json({ message: `accept order error ${error}` })
    }
}



export const getCurrentOrder = async (req, res) => {
    try {
        const assignment = await DeliveryAssignment.findOne({
            assignedTo: req.userId,
            status: "assigned"
        })
            .populate("shop", "name")
            .populate("assignedTo", "fullName email mobile location")
            .populate({
                path: "order",
                populate: [{ path: "user", select: "fullName email location mobile" }]

            })

        if (!assignment) {
            return res.status(400).json({ message: "assignment not found" })
        }
        if (!assignment.order) {
            return res.status(400).json({ message: "order not found" })
        }

        const shopOrder = assignment.order.shopOrders.find(so => String(so._id) == String(assignment.shopOrderId))

        if (!shopOrder) {
            return res.status(400).json({ message: "shopOrder not found" })
        }

        let deliveryBoyLocation = { lat: null, lon: null }
        if (assignment.assignedTo.location.coordinates.length == 2) {
            deliveryBoyLocation.lat = assignment.assignedTo.location.coordinates[1]
            deliveryBoyLocation.lon = assignment.assignedTo.location.coordinates[0]
        }

        let customerLocation = { lat: null, lon: null }
        if (assignment.order.deliveryAddress) {
            customerLocation.lat = assignment.order.deliveryAddress.latitude
            customerLocation.lon = assignment.order.deliveryAddress.longitude
        }

        return res.status(200).json({
            _id: assignment.order._id,
            user: assignment.order.user,
            shopOrder,
            deliveryAddress: assignment.order.deliveryAddress,
            scheduleType: assignment.order.scheduleType,
            scheduledFor: assignment.order.scheduledFor,
            deliveryBoyLocation,
            customerLocation
        })


    } catch (error) {

    }
}

export const getOrderById = async (req, res) => {
    try {
        const { orderId } = req.params
        const order = await Order.findById(orderId)
            .populate("user")
            .populate({
                path: "shopOrders.shop",
                model: "Shop"
            })
            .populate({
                path: "shopOrders.assignedDeliveryBoy",
                model: "User"
            })
            .populate({
                path: "shopOrders.shopOrderItems.item",
                model: "Item"
            })
            .lean()

        if (!order) {
            return res.status(400).json({ message: "order not found" })
        }
        return res.status(200).json(order)
    } catch (error) {
        return res.status(500).json({ message: `get by id order error ${error}` })
    }
}

export const getOrderChatMessages = async (req, res) => {
    try {
        const { orderId, shopOrderId } = req.params
        const order = await Order.findById(orderId)
        if (!order) {
            return res.status(400).json({ message: "order not found" })
        }

        const shopOrder = order.shopOrders.id(shopOrderId)
        if (!shopOrder) {
            return res.status(400).json({ message: "shop order not found" })
        }

        if (!isParticipant(order, shopOrder, req.userId)) {
            return res.status(403).json({ message: "you are not allowed to access this chat" })
        }

        return res.status(200).json(shopOrder.chatMessages || [])
    } catch (error) {
        return res.status(500).json({ message: `get order chat error ${error}` })
    }
}

export const sendOrderChatMessage = async (req, res) => {
    try {
        const { orderId, shopOrderId, text, quickReply = false } = req.body
        const sanitizedText = String(text || "").trim()
        if (!orderId || !shopOrderId || !sanitizedText) {
            return res.status(400).json({ message: "orderId, shopOrderId and text are required" })
        }
        if (sanitizedText.length > 240) {
            return res.status(400).json({ message: "message is too long" })
        }

        const [order, sender] = await Promise.all([
            Order.findById(orderId),
            User.findById(req.userId).select("fullName role socketId")
        ])

        if (!order) {
            return res.status(400).json({ message: "order not found" })
        }
        if (!sender) {
            return res.status(400).json({ message: "sender not found" })
        }

        const shopOrder = order.shopOrders.id(shopOrderId)
        if (!shopOrder) {
            return res.status(400).json({ message: "shop order not found" })
        }
        if (!isParticipant(order, shopOrder, req.userId)) {
            return res.status(403).json({ message: "you are not allowed to send message in this chat" })
        }

        shopOrder.chatMessages.push({
            sender: sender._id,
            senderName: sender.fullName,
            senderRole: sender.role,
            text: sanitizedText,
            quickReply: Boolean(quickReply)
        })
        await order.save()

        const message = shopOrder.chatMessages[shopOrder.chatMessages.length - 1]
        const payload = {
            orderId: String(order._id),
            shopOrderId: String(shopOrder._id),
            message
        }

        const participants = [order.user, shopOrder.owner, shopOrder.assignedDeliveryBoy].filter(Boolean)
        const users = await User.find({ _id: { $in: participants } }).select("_id socketId role")
        const io = req.app.get("io")

        users.forEach((participant) => {
            if (io && participant.socketId) {
                io.to(participant.socketId).emit("chat-message", payload)
            }
            if (String(participant._id) !== String(sender._id)) {
                emitNotification(io, participant.socketId, buildNotification({
                    type: "chat_message",
                    title: "New chat message",
                    message: `${sender.fullName}: ${sanitizedText}`,
                    route: getParticipantRoute(participant.role, order._id)
                }))
            }
        })

        return res.status(201).json(message)
    } catch (error) {
        return res.status(500).json({ message: `send chat message error ${error}` })
    }
}

export const sendDeliveryOtp = async (req, res) => {
    try {
        const { orderId, shopOrderId } = req.body
        const order = await Order.findById(orderId).populate("user")
        const shopOrder = order.shopOrders.id(shopOrderId)
        if (!order || !shopOrder) {
            return res.status(400).json({ message: "enter valid order/shopOrderid" })
        }
        const otp = Math.floor(1000 + Math.random() * 9000).toString()
        shopOrder.deliveryOtp = otp
        shopOrder.otpExpires = Date.now() + 5 * 60 * 1000
        await order.save()
        await sendDeliveryOtpMail(order.user, otp)
        return res.status(200).json({ message: `Otp sent Successfuly to ${order?.user?.fullName}` })
    } catch (error) {
        return res.status(500).json({ message: `delivery otp error ${error}` })
    }
}

export const verifyDeliveryOtp = async (req, res) => {
    try {
        const { orderId, shopOrderId, otp } = req.body
        const order = await Order.findById(orderId).populate("user")
        const shopOrder = order.shopOrders.id(shopOrderId)
        if (!order || !shopOrder) {
            return res.status(400).json({ message: "enter valid order/shopOrderid" })
        }
        if (shopOrder.deliveryOtp !== otp || !shopOrder.otpExpires || shopOrder.otpExpires < Date.now()) {
            return res.status(400).json({ message: "Invalid/Expired Otp" })
        }

        shopOrder.status = "delivered"
        shopOrder.deliveredAt = Date.now()
        await order.save()
        await DeliveryAssignment.deleteOne({
            shopOrderId: shopOrder._id,
            order: order._id,
            assignedTo: shopOrder.assignedDeliveryBoy
        })

        const owner = await User.findById(shopOrder.owner).select("socketId")
        const deliveryBoy = await User.findById(shopOrder.assignedDeliveryBoy).select("socketId")
        const io = req.app.get("io")

        emitNotification(io, order?.user?.socketId, buildNotification({
            type: "order_delivered",
            title: "Order delivered",
            message: `Order #${shortOrderId(order._id)} has been delivered successfully.`,
            route: `/track-order/${order._id}`
        }))
        emitNotification(io, owner?.socketId, buildNotification({
            type: "order_delivered",
            title: "Order delivered",
            message: `Order #${shortOrderId(order._id)} was marked delivered.`,
            route: "/my-orders"
        }))
        emitNotification(io, deliveryBoy?.socketId, buildNotification({
            type: "order_delivered",
            title: "Delivery completed",
            message: `You completed order #${shortOrderId(order._id)}.`,
            route: "/"
        }))

        return res.status(200).json({ message: "Order Delivered Successfully!" })

    } catch (error) {
        return res.status(500).json({ message: `verify delivery otp error ${error}` })
    }
}

export const getTodayDeliveries = async (req, res) => {
    try {
        const deliveryBoyId = req.userId
        const startsOfDay = new Date()
        startsOfDay.setHours(0, 0, 0, 0)

        const orders = await Order.find({
            "shopOrders.assignedDeliveryBoy": deliveryBoyId,
            "shopOrders.status": "delivered",
            "shopOrders.deliveredAt": { $gte: startsOfDay }
        }).select("shopOrders").lean()

        const todaysDeliveries = []
        orders.forEach((order) => {
            ; (order.shopOrders || []).forEach((shopOrder) => {
                if (String(shopOrder.assignedDeliveryBoy) !== String(deliveryBoyId)) return
                if (shopOrder.status !== "delivered" || !shopOrder.deliveredAt) return
                if (new Date(shopOrder.deliveredAt) < startsOfDay) return
                todaysDeliveries.push(shopOrder)
            })
        })

        const stats = {}
        todaysDeliveries.forEach((shopOrder) => {
            const hour = new Date(shopOrder.deliveredAt).getHours()
            stats[hour] = (stats[hour] || 0) + 1
        })

        const formattedStats = Object.keys(stats).map((hour) => ({
            hour: parseInt(hour),
            count: stats[hour]
        }))

        formattedStats.sort((a, b) => a.hour - b.hour)

        return res.status(200).json(formattedStats)
    } catch (error) {
        return res.status(500).json({ message: `today deliveries error ${error}` })
    }
}

export const getDeliveryEarningsPanel = async (req, res) => {
    try {
        const deliveryBoyId = req.userId
        const requestedDays = Number(req.query?.days || 7)
        const days = Math.min(30, Math.max(1, Number.isNaN(requestedDays) ? 7 : requestedDays))

        const now = new Date()
        const rangeStart = new Date(now)
        rangeStart.setHours(0, 0, 0, 0)
        rangeStart.setDate(rangeStart.getDate() - (days - 1))

        const [periodOrders, lifetimeOrders] = await Promise.all([
            Order.find({
                "shopOrders.assignedDeliveryBoy": deliveryBoyId,
                "shopOrders.status": "delivered",
                "shopOrders.deliveredAt": { $gte: rangeStart }
            }).select("shopOrders").lean(),
            Order.find({
                "shopOrders.assignedDeliveryBoy": deliveryBoyId,
                "shopOrders.status": "delivered"
            }).select("shopOrders").lean()
        ])

        const getDeliveredTripsFromOrders = (orders = [], startsAt = null) => {
            const trips = []
            orders.forEach((order) => {
                ; (order.shopOrders || []).forEach((shopOrder) => {
                    if (String(shopOrder.assignedDeliveryBoy) !== String(deliveryBoyId)) return
                    if (shopOrder.status !== "delivered" || !shopOrder.deliveredAt) return
                    const deliveredAt = new Date(shopOrder.deliveredAt)
                    if (startsAt && deliveredAt < startsAt) return
                    trips.push({
                        deliveredAt,
                        subtotal: Number(shopOrder.subtotal || 0)
                    })
                })
            })
            return trips
        }

        const periodTrips = getDeliveredTripsFromOrders(periodOrders, rangeStart)
        const lifetimeTrips = getDeliveredTripsFromOrders(lifetimeOrders)

        const dayMap = new Map()
        for (let offset = 0; offset < days; offset += 1) {
            const date = new Date(rangeStart)
            date.setDate(rangeStart.getDate() + offset)
            dayMap.set(getDateKey(date), {
                date: getDateKey(date),
                completedTrips: 0,
                peakTrips: 0,
                grossOrderValue: 0
            })
        }

        periodTrips.forEach((trip) => {
            const key = getDateKey(trip.deliveredAt)
            if (!dayMap.has(key)) return
            const entry = dayMap.get(key)
            entry.completedTrips += 1
            entry.grossOrderValue = roundAmount(entry.grossOrderValue + Number(trip.subtotal || 0))
            if (isPeakDeliveryHour(trip.deliveredAt)) {
                entry.peakTrips += 1
            }
            dayMap.set(key, entry)
        })

        const todayKey = getDateKey(now)
        const dailyBreakdown = Array.from(dayMap.values())
            .map((entry) => {
                const payout = calculateDeliveryPayout({
                    completedTrips: entry.completedTrips,
                    peakTrips: entry.peakTrips
                })
                return {
                    date: entry.date,
                    completedTrips: entry.completedTrips,
                    peakTrips: entry.peakTrips,
                    grossOrderValue: entry.grossOrderValue,
                    basePayout: payout.basePayout,
                    incentive: payout.incentives.total,
                    incentiveBreakdown: payout.incentives,
                    totalPayout: payout.totalPayout,
                    payoutStatus: entry.date === todayKey ? "processing" : "paid"
                }
            })
            .sort((a, b) => new Date(b.date) - new Date(a.date))

        const summary = dailyBreakdown.reduce((acc, day) => {
            acc.completedTrips += Number(day.completedTrips || 0)
            acc.basePayout += Number(day.basePayout || 0)
            acc.incentive += Number(day.incentive || 0)
            acc.totalPayout += Number(day.totalPayout || 0)
            acc.grossOrderValue += Number(day.grossOrderValue || 0)
            if (day.payoutStatus === "processing") {
                acc.processingAmount += Number(day.totalPayout || 0)
            }
            return acc
        }, {
            completedTrips: 0,
            basePayout: 0,
            incentive: 0,
            totalPayout: 0,
            grossOrderValue: 0,
            processingAmount: 0
        })

        const todayStats = dailyBreakdown.find((entry) => entry.date === todayKey) || {
            completedTrips: 0,
            basePayout: 0,
            incentive: 0,
            totalPayout: 0,
            payoutStatus: "processing"
        }

        return res.status(200).json({
            config: {
                basePayoutPerTrip: DELIVERY_BASE_PAYOUT_PER_TRIP,
                peakHourBonusPerTrip: DELIVERY_PEAK_HOUR_BONUS_PER_TRIP,
                volumeTiers: DELIVERY_VOLUME_INCENTIVE_TIERS
            },
            summary: {
                ...summary,
                basePayout: roundAmount(summary.basePayout),
                incentive: roundAmount(summary.incentive),
                totalPayout: roundAmount(summary.totalPayout),
                grossOrderValue: roundAmount(summary.grossOrderValue),
                processingAmount: roundAmount(summary.processingAmount),
                paidAmount: roundAmount(summary.totalPayout - summary.processingAmount),
                lifetimeCompletedTrips: lifetimeTrips.length
            },
            today: todayStats,
            dailyBreakdown
        })
    } catch (error) {
        return res.status(500).json({ message: `delivery earnings panel error ${error}` })
    }
}



