import jwt from "jsonwebtoken"
import User from "../models/user.model.js"
const isAuth=async (req,res,next) => {
    try {
        const token=req.cookies.token
        if(!token){
            return res.status(400).json({message:"token not found"})
        }
        const decodeToken=jwt.verify(token,process.env.JWT_SECRET)
        if(!decodeToken){
 return res.status(400).json({message:"token not verify"})
        }
        const user = await User.findById(decodeToken.userId).select("_id accountStatus")
        if (!user) {
            return res.status(401).json({ message: "user not found" })
        }
        if (user.accountStatus === "suspended") {
            res.clearCookie("token")
            return res.status(403).json({ message: "account suspended by admin" })
        }
        req.userId=decodeToken.userId
        next()
    } catch (error) {
         return res.status(500).json({message:"isAuth error"})
    }
}

export default isAuth
