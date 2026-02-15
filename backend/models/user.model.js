import mongoose from "mongoose";

const savedAddressSchema = new mongoose.Schema({
    label: {
        type: String,
        enum: ["Home", "Work", "Other"],
        default: "Other"
    },
    text: {
        type: String,
        required: true
    },
    latitude: {
        type: Number,
        required: true
    },
    longitude: {
        type: Number,
        required: true
    },
    isDefault: {
        type: Boolean,
        default: false
    }
}, { timestamps: true })

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique:true
    },
    password:{
        type: String,
    },
    mobile:{
        type: String,
        required: true, 
    },
    role:{
        type:String,
        enum:["user","owner","deliveryBoy","admin"],
        required:true
    },
    accountStatus: {
        type: String,
        enum: ["active", "suspended"],
        default: "active"
    },
    referralCode: {
        type: String,
        unique: true,
        sparse: true
    },
    referredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    loyaltyPoints: {
        type: Number,
        default: 0
    },
    lifetimeLoyaltyPoints: {
        type: Number,
        default: 0
    },
    resetOtp:{
        type:String
    },
    isOtpVerified:{
        type:Boolean,
        default:false
    },
    otpExpires:{
        type:Date
    },
    socketId:{
     type:String,
     
    },
    isOnline:{
        type:Boolean,
        default:false
    },
    location:{
type:{type:String,enum:['Point'],default:'Point'},
coordinates:{type:[Number],default:[0,0]}
   },
   favoriteItems: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Item"
   }],
   savedAddresses: [savedAddressSchema]
  
}, { timestamps: true })

userSchema.index({location:'2dsphere'})


const User=mongoose.model("User",userSchema)
export default User
