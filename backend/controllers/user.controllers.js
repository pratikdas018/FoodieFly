import User from "../models/user.model.js"
import Item from "../models/item.model.js"

const publicUserSelect = "-password -resetOtp -otpExpires -isOtpVerified"

const normalizeAddressLabel = (label) => {
    const value = String(label || "Other").trim().toLowerCase()
    if (value === "home") return "Home"
    if (value === "work") return "Work"
    return "Other"
}

const generateUniqueReferralCode = async () => {
    let attempts = 0
    while (attempts < 10) {
        const code = `VGO${Math.random().toString(36).slice(2, 8).toUpperCase()}`
        const exists = await User.exists({ referralCode: code })
        if (!exists) return code
        attempts += 1
    }
    return `VGO${Date.now().toString(36).slice(-6).toUpperCase()}`
}

export const getCurrentUser=async (req,res) => {
    try {
        const userId=req.userId
        if(!userId){
            return res.status(400).json({message:"userId is not found"})
        }
        let user=await User.findById(userId)
        if(!user){
               return res.status(400).json({message:"user is not found"})
        }
        if (!user.referralCode) {
            user.referralCode = await generateUniqueReferralCode()
            await user.save()
        }
        user = await User.findById(userId).select(publicUserSelect)
        return res.status(200).json(user)
    } catch (error) {
        return res.status(500).json({message:`get current user error ${error}`})
    }
}

export const updateUserProfile=async (req,res) => {
    try {
        const { fullName, mobile } = req.body
        const updates = {}

        if (fullName != null) {
            const trimmedName = String(fullName).trim()
            if (trimmedName.length < 2) {
                return res.status(400).json({ message: "fullName must be at least 2 characters" })
            }
            updates.fullName = trimmedName
        }

        if (mobile != null) {
            const normalizedMobile = String(mobile).trim()
            if (normalizedMobile.length < 10) {
                return res.status(400).json({ message: "mobile no must be at least 10 digits." })
            }
            updates.mobile = normalizedMobile
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ message: "nothing to update" })
        }

        const user=await User.findByIdAndUpdate(req.userId, updates,{new:true}).select(publicUserSelect)
        if(!user){
               return res.status(400).json({message:"user is not found"})
        }
        
        return res.status(200).json(user)
    } catch (error) {
           return res.status(500).json({message:`update profile user error ${error}`})
    }
}

export const updateUserLocation=async (req,res) => {
    try {
        const {lat,lon}=req.body
        const user=await User.findByIdAndUpdate(req.userId,{
            location:{
                type:'Point',
                coordinates:[lon,lat]
            }
        },{new:true})
         if(!user){
               return res.status(400).json({message:"user is not found"})
        }
        
        return res.status(200).json({message:'location updated'})
    } catch (error) {
           return res.status(500).json({message:`update location user error ${error}`})
    }
}

export const toggleFavoriteItem = async (req, res) => {
    try {
        const { itemId } = req.params
        const item = await Item.findById(itemId).select("_id")
        if (!item) {
            return res.status(400).json({ message: "item not found" })
        }

        const user = await User.findById(req.userId)
        if (!user) {
            return res.status(400).json({ message: "user is not found" })
        }

        const alreadyFavorite = user.favoriteItems?.some((favoriteId) => String(favoriteId) === String(itemId))
        if (alreadyFavorite) {
            user.favoriteItems = user.favoriteItems.filter((favoriteId) => String(favoriteId) !== String(itemId))
        } else {
            user.favoriteItems.unshift(item._id)
        }
        await user.save()

        const safeUser = await User.findById(req.userId).select(publicUserSelect)
        return res.status(200).json({
            message: alreadyFavorite ? "Removed from favorites" : "Added to favorites",
            isFavorite: !alreadyFavorite,
            user: safeUser
        })
    } catch (error) {
        return res.status(500).json({ message: `toggle favorite item error ${error}` })
    }
}

export const getFavoriteItems = async (req, res) => {
    try {
        const user = await User.findById(req.userId).select("favoriteItems")
        if (!user) {
            return res.status(400).json({ message: "user is not found" })
        }

        const items = await Item.find({
            _id: { $in: user.favoriteItems || [] }
        }).populate("shop", "name city image")

        const orderMap = new Map((user.favoriteItems || []).map((id, index) => [String(id), index]))
        const sorted = items.sort((a, b) => (orderMap.get(String(a._id)) ?? 99999) - (orderMap.get(String(b._id)) ?? 99999))

        return res.status(200).json(sorted)
    } catch (error) {
        return res.status(500).json({ message: `get favorite items error ${error}` })
    }
}

export const getUserAddresses = async (req, res) => {
    try {
        const user = await User.findById(req.userId).select("savedAddresses")
        if (!user) {
            return res.status(400).json({ message: "user is not found" })
        }
        return res.status(200).json(user.savedAddresses || [])
    } catch (error) {
        return res.status(500).json({ message: `get user addresses error ${error}` })
    }
}

export const saveUserAddress = async (req, res) => {
    try {
        const { addressId = null, label = "Other", text, latitude, longitude, isDefault = false } = req.body
        const parsedLatitude = Number(latitude)
        const parsedLongitude = Number(longitude)
        const trimmedText = String(text || "").trim()

        if (!trimmedText || Number.isNaN(parsedLatitude) || Number.isNaN(parsedLongitude)) {
            return res.status(400).json({ message: "valid text, latitude and longitude are required" })
        }

        const user = await User.findById(req.userId)
        if (!user) {
            return res.status(400).json({ message: "user is not found" })
        }

        let targetAddress = null
        if (addressId) {
            targetAddress = user.savedAddresses.id(addressId)
        }

        if (targetAddress) {
            targetAddress.label = normalizeAddressLabel(label)
            targetAddress.text = trimmedText
            targetAddress.latitude = parsedLatitude
            targetAddress.longitude = parsedLongitude
            if (Boolean(isDefault)) {
                user.savedAddresses.forEach((address) => {
                    address.isDefault = String(address._id) === String(targetAddress._id)
                })
            }
        } else {
            const shouldBeDefault = Boolean(isDefault) || (user.savedAddresses || []).length === 0
            if (shouldBeDefault) {
                user.savedAddresses.forEach((address) => {
                    address.isDefault = false
                })
            }
            user.savedAddresses.push({
                label: normalizeAddressLabel(label),
                text: trimmedText,
                latitude: parsedLatitude,
                longitude: parsedLongitude,
                isDefault: shouldBeDefault
            })
        }

        if ((user.savedAddresses || []).length > 0 && !user.savedAddresses.some((address) => address.isDefault)) {
            user.savedAddresses[0].isDefault = true
        }

        await user.save()
        const safeUser = await User.findById(req.userId).select(publicUserSelect)
        return res.status(200).json({
            message: "address saved successfully",
            addresses: safeUser.savedAddresses || [],
            user: safeUser
        })
    } catch (error) {
        return res.status(500).json({ message: `save user address error ${error}` })
    }
}

export const setDefaultUserAddress = async (req, res) => {
    try {
        const { addressId } = req.params
        const user = await User.findById(req.userId)
        if (!user) {
            return res.status(400).json({ message: "user is not found" })
        }
        const address = user.savedAddresses.id(addressId)
        if (!address) {
            return res.status(400).json({ message: "address not found" })
        }

        user.savedAddresses.forEach((entry) => {
            entry.isDefault = String(entry._id) === String(addressId)
        })
        await user.save()

        const safeUser = await User.findById(req.userId).select(publicUserSelect)
        return res.status(200).json({
            message: "default address updated",
            addresses: safeUser.savedAddresses || [],
            user: safeUser
        })
    } catch (error) {
        return res.status(500).json({ message: `set default address error ${error}` })
    }
}

export const deleteUserAddress = async (req, res) => {
    try {
        const { addressId } = req.params
        const user = await User.findById(req.userId)
        if (!user) {
            return res.status(400).json({ message: "user is not found" })
        }

        const existingAddress = user.savedAddresses.id(addressId)
        if (!existingAddress) {
            return res.status(400).json({ message: "address not found" })
        }
        const wasDefault = Boolean(existingAddress.isDefault)
        user.savedAddresses = user.savedAddresses.filter((entry) => String(entry._id) !== String(addressId))

        if (wasDefault && user.savedAddresses.length > 0) {
            user.savedAddresses[0].isDefault = true
        }
        await user.save()

        const safeUser = await User.findById(req.userId).select(publicUserSelect)
        return res.status(200).json({
            message: "address deleted",
            addresses: safeUser.savedAddresses || [],
            user: safeUser
        })
    } catch (error) {
        return res.status(500).json({ message: `delete user address error ${error}` })
    }
}

