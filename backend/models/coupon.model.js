import mongoose from "mongoose"

const couponUsageSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    count: {
        type: Number,
        default: 0
    }
}, { _id: false })

const couponSchema = new mongoose.Schema({
    code: {
        type: String,
        unique: true,
        required: true,
        uppercase: true,
        trim: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ""
    },
    discountType: {
        type: String,
        enum: ["flat", "percent"],
        required: true
    },
    discountValue: {
        type: Number,
        required: true
    },
    maxDiscount: {
        type: Number,
        default: null
    },
    minOrderAmount: {
        type: Number,
        default: 0
    },
    validScheduleTypes: {
        type: [String],
        enum: ["now", "lunch", "dinner"],
        default: ["now", "lunch", "dinner"]
    },
    usageLimitPerUser: {
        type: Number,
        default: 1
    },
    active: {
        type: Boolean,
        default: true
    },
    expiresAt: {
        type: Date,
        default: null
    },
    usage: [couponUsageSchema]
}, { timestamps: true })

couponSchema.index({ code: 1 }, { unique: true })

const Coupon = mongoose.model("Coupon", couponSchema)

export default Coupon
