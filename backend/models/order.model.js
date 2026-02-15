import mongoose from "mongoose";

const shopOrderItemSchema = new mongoose.Schema({
    item:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Item",
        required:true
    },
    name:String,
    price:Number,
    quantity:Number
}, { timestamps: true })

const chatMessageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    senderName: {
        type: String,
        required: true
    },
    senderRole: {
        type: String,
        enum: ["user", "owner", "deliveryBoy"],
        required: true
    },
    text: {
        type: String,
        required: true
    },
    quickReply: {
        type: Boolean,
        default: false
    }
}, { timestamps: true })

const shopOrderSchema = new mongoose.Schema({
    shop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Shop"
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    subtotal: Number,
    shopOrderItems: [shopOrderItemSchema],
    status:{
        type:String,
        enum:["pending","preparing","out of delivery","delivered","cancelled"],
        default:"pending"
    },
  assignment:{
     type: mongoose.Schema.Types.ObjectId,
    ref: "DeliveryAssignment",
    default:null
  },
  assignedDeliveryBoy:{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
deliveryOtp:{
        type:String,
        default:null
    },
otpExpires:{
        type:Date,
        default:null
    },
deliveredAt:{
    type:Date,
    default:null
},
chatMessages: [chatMessageSchema]

}, { timestamps: true })

const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    paymentMethod: {
        type: String,
        enum: ['cod', "online"],
        required: true
    },
    deliveryAddress: {
        text: String,
        latitude: Number,
        longitude: Number
    },
    subtotalAmount: {
        type: Number,
        default: 0
    },
    deliveryFee: {
        type: Number,
        default: 0
    },
    grossAmount: {
        type: Number,
        default: 0
    },
    couponCode: {
        type: String,
        default: ""
    },
    couponDiscount: {
        type: Number,
        default: 0
    },
    loyaltyPointsUsed: {
        type: Number,
        default: 0
    },
    loyaltyDiscount: {
        type: Number,
        default: 0
    },
    loyaltyPointsEarned: {
        type: Number,
        default: 0
    },
    totalAmount: {
        type: Number,
        default: 0
    },
    scheduleType: {
        type: String,
        enum: ["now", "lunch", "dinner"],
        default: "now"
    },
    scheduledFor: {
        type: Date,
        default: null
    },
    shopOrders: [shopOrderSchema],
    payment:{
        type:Boolean,
        default:false
    },
    razorpayOrderId:{
        type:String,
        default:""
    },
   razorpayPaymentId:{
    type:String,
       default:""
   },
   benefitsApplied: {
    type: Boolean,
    default: false
   }
}, { timestamps: true })

const Order=mongoose.model("Order",orderSchema)
export default Order
