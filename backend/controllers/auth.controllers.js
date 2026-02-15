import User from "../models/user.model.js"
import bcrypt from "bcryptjs"
import genToken from "../utils/token.js"
import { sendOtpMail } from "../utils/mail.js"

const isProduction = process.env.NODE_ENV === "production"
const authCookieOptions = {
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true
}

const cleanReferralCode = (value) => String(value || "").trim().toUpperCase()
const publicRoles = ["user", "owner", "deliveryBoy"]

const randomReferralCode = (fullName = "") => {
    const initials = String(fullName || "")
        .trim()
        .split(/\s+/)
        .map((part) => part[0] || "")
        .join("")
        .slice(0, 3)
        .toUpperCase()
    const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase()
    return `${initials || "VGO"}${randomPart}`.slice(0, 9)
}

const generateUniqueReferralCode = async (fullName) => {
    let attempts = 0
    while (attempts < 10) {
        const code = randomReferralCode(fullName)
        const exists = await User.exists({ referralCode: code })
        if (!exists) return code
        attempts += 1
    }
    return `VGO${Date.now().toString(36).slice(-6).toUpperCase()}`
}

const ensureUserReferralCode = async (user) => {
    if (!user || user.referralCode) return user
    user.referralCode = await generateUniqueReferralCode(user.fullName)
    await user.save()
    return user
}

const resolveReferrer = async (referralCode) => {
    const normalizedCode = cleanReferralCode(referralCode)
    if (!normalizedCode) return null
    const referrer = await User.findOne({ referralCode: normalizedCode }).select("_id")
    return referrer || null
}

export const signUp=async (req,res) => {
    try {
        const {fullName,email,password,mobile,role,referralCode}=req.body
        if (!publicRoles.includes(role)) {
            return res.status(400).json({ message: "invalid role" })
        }
        let user=await User.findOne({email})
        if(user){
            return res.status(400).json({message:"User Already exist."})
        }
        if(password.length<6){
            return res.status(400).json({message:"password must be at least 6 characters."})
        }
        if(mobile.length<10){
            return res.status(400).json({message:"mobile no must be at least 10 digits."})
        }
        const referrer = await resolveReferrer(referralCode)
        if (cleanReferralCode(referralCode) && !referrer) {
            return res.status(400).json({ message: "Invalid referral code." })
        }

        const hashedPassword=await bcrypt.hash(password,10)
        const generatedReferralCode = await generateUniqueReferralCode(fullName)
        user=await User.create({
            fullName,
            email,
            role,
            mobile,
            password:hashedPassword,
            referralCode: generatedReferralCode,
            referredBy: referrer?._id || null,
            loyaltyPoints: referrer ? 25 : 0,
            lifetimeLoyaltyPoints: referrer ? 25 : 0
        })
        if (referrer) {
            await User.findByIdAndUpdate(referrer._id, {
                $inc: {
                    loyaltyPoints: 75,
                    lifetimeLoyaltyPoints: 75
                }
            })
        }

        const token=await genToken(user._id)
        res.cookie("token",token,authCookieOptions)
        const safeUser = await User.findById(user._id).select("-password -resetOtp -otpExpires -isOtpVerified")
        return res.status(201).json(safeUser)

    } catch (error) {
        return res.status(500).json(`sign up error ${error}`)
    }
}

export const signIn=async (req,res) => {
    try {
        const {email,password}=req.body
        const user=await User.findOne({email})
        if(!user){
            return res.status(400).json({message:"User does not exist."})
        }
        if (user.accountStatus === "suspended") {
            return res.status(403).json({ message: "Account suspended by admin." })
        }
        
     const isMatch=await bcrypt.compare(password,user.password)
     if(!isMatch){
         return res.status(400).json({message:"incorrect Password"})
     }
        await ensureUserReferralCode(user)

        const token=await genToken(user._id)
        res.cookie("token",token,authCookieOptions)
        const safeUser = await User.findById(user._id).select("-password -resetOtp -otpExpires -isOtpVerified")
        return res.status(200).json(safeUser)

    } catch (error) {
        return res.status(500).json(`sign In error ${error}`)
    }
}

export const signOut=async (req,res) => {
    try {
        res.clearCookie("token",{
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            httpOnly: true
        })
return res.status(200).json({message:"log out successfully"})
    } catch (error) {
        return res.status(500).json(`sign out error ${error}`)
    }
}

export const sendOtp=async (req,res) => {
  try {
    const {email}=req.body
    const user=await User.findOne({email})
    if(!user){
       return res.status(400).json({message:"User does not exist."})
    }
    const otp=Math.floor(1000 + Math.random() * 9000).toString()
    user.resetOtp=otp
    user.otpExpires=Date.now()+5*60*1000
    user.isOtpVerified=false
    await user.save()
    await sendOtpMail(email,otp)
    return res.status(200).json({message:"otp sent successfully"})
  } catch (error) {
     return res.status(500).json(`send otp error ${error}`)
  }  
}

export const verifyOtp=async (req,res) => {
    try {
        const {email,otp}=req.body
        const user=await User.findOne({email})
        if(!user || user.resetOtp!=otp || user.otpExpires<Date.now()){
            return res.status(400).json({message:"invalid/expired otp"})
        }
        user.isOtpVerified=true
        user.resetOtp=undefined
        user.otpExpires=undefined
        await user.save()
        return res.status(200).json({message:"otp verify successfully"})
    } catch (error) {
         return res.status(500).json(`verify otp error ${error}`)
    }
}

export const resetPassword=async (req,res) => {
    try {
        const {email,newPassword}=req.body
        const user=await User.findOne({email})
    if(!user || !user.isOtpVerified){
       return res.status(400).json({message:"otp verification required"})
    }
    const hashedPassword=await bcrypt.hash(newPassword,10)
    user.password=hashedPassword
    user.isOtpVerified=false
    await user.save()
     return res.status(200).json({message:"password reset successfully"})
    } catch (error) {
         return res.status(500).json(`reset password error ${error}`)
    }
}

export const googleAuth=async (req,res) => {
    try {
        const {fullName,email,mobile,role,referralCode}=req.body
        if (!publicRoles.includes(role)) {
            return res.status(400).json({ message: "invalid role" })
        }
        let user=await User.findOne({email})
        if(!user){
            const referrer = await resolveReferrer(referralCode)
            if (cleanReferralCode(referralCode) && !referrer) {
                return res.status(400).json({ message: "Invalid referral code." })
            }
            const generatedReferralCode = await generateUniqueReferralCode(fullName)
            user=await User.create({
                fullName,
                email,
                mobile,
                role,
                referralCode: generatedReferralCode,
                referredBy: referrer?._id || null,
                loyaltyPoints: referrer ? 25 : 0,
                lifetimeLoyaltyPoints: referrer ? 25 : 0
            })
            if (referrer) {
                await User.findByIdAndUpdate(referrer._id, {
                    $inc: {
                        loyaltyPoints: 75,
                        lifetimeLoyaltyPoints: 75
                    }
                })
            }
        } else {
            if (user.accountStatus === "suspended") {
                return res.status(403).json({ message: "Account suspended by admin." })
            }
            await ensureUserReferralCode(user)
        }

        const token=await genToken(user._id)
        res.cookie("token",token,authCookieOptions)
        const safeUser = await User.findById(user._id).select("-password -resetOtp -otpExpires -isOtpVerified")
        return res.status(200).json(safeUser)


    } catch (error) {
         return res.status(500).json(`googleAuth error ${error}`)
    }
}
