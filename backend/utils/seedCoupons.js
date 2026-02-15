import Coupon from "../models/coupon.model.js"

const defaultCoupons = [
    {
        code: "WELCOME50",
        title: "Welcome Offer",
        description: "Flat INR 50 off on orders above INR 299",
        discountType: "flat",
        discountValue: 50,
        minOrderAmount: 299,
        usageLimitPerUser: 1
    },
    {
        code: "LUNCH20",
        title: "Lunch Saver",
        description: "20% off up to INR 120 on lunch slot orders",
        discountType: "percent",
        discountValue: 20,
        maxDiscount: 120,
        minOrderAmount: 249,
        validScheduleTypes: ["lunch"],
        usageLimitPerUser: 2
    },
    {
        code: "DINNER25",
        title: "Dinner Treat",
        description: "25% off up to INR 150 on dinner slot orders",
        discountType: "percent",
        discountValue: 25,
        maxDiscount: 150,
        minOrderAmount: 349,
        validScheduleTypes: ["dinner"],
        usageLimitPerUser: 2
    }
]

export const seedDefaultCoupons = async () => {
    for (const coupon of defaultCoupons) {
        await Coupon.updateOne(
            { code: coupon.code },
            { $setOnInsert: coupon },
            { upsert: true }
        )
    }
}
