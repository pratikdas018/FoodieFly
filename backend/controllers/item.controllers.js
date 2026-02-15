import Item from "../models/item.model.js";
import Shop from "../models/shop.model.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import User from "../models/user.model.js";

const parseInStock = (value, fallback = true) => {
    if (value === undefined || value === null || value === "") return fallback
    if (typeof value === "boolean") return value
    return String(value).toLowerCase() === "true"
}

export const addItem = async (req, res) => {
    try {
        const { name, category, foodType, price, inStock } = req.body
        let image;
        if (req.file) {
            image = await uploadOnCloudinary(req.file.path)
        }
        const shop = await Shop.findOne({ owner: req.userId })
        if (!shop) {
            return res.status(400).json({ message: "shop not found" })
        }
        if (shop.adminStatus === "suspended") {
            return res.status(403).json({ message: "shop is suspended by admin" })
        }
        const item = await Item.create({
            name,
            category,
            foodType,
            price,
            image,
            inStock: parseInStock(inStock, true),
            shop: shop._id
        })

        shop.items.push(item._id)
        await shop.save()
        await shop.populate("owner")
        await shop.populate({
            path: "items",
            options: { sort: { updatedAt: -1 } }
        })
        return res.status(201).json(shop)

    } catch (error) {
        return res.status(500).json({ message: `add item error ${error}` })
    }
}

export const editItem = async (req, res) => {
    try {
        const itemId = req.params.itemId
        const { name, category, foodType, price, inStock } = req.body
        let image;
        if (req.file) {
            image = await uploadOnCloudinary(req.file.path)
        }
        const updatePayload = {
            name,
            category,
            foodType,
            price,
            inStock: parseInStock(inStock, true)
        }
        if (image) {
            updatePayload.image = image
        }
        const ownerShop = await Shop.findOne({ owner: req.userId, items: itemId }).select("adminStatus")
        if (!ownerShop) {
            return res.status(403).json({ message: "you are not allowed to edit this item" })
        }
        if (ownerShop.adminStatus === "suspended") {
            return res.status(403).json({ message: "shop is suspended by admin" })
        }
        const item = await Item.findByIdAndUpdate(itemId, updatePayload, { new: true })
        if (!item) {
            return res.status(400).json({ message: "item not found" })
        }
        const shop = await Shop.findOne({ owner: req.userId }).populate({
            path: "items",
            options: { sort: { updatedAt: -1 } }
        })
        return res.status(200).json(shop)

    } catch (error) {
        return res.status(500).json({ message: `edit item error ${error}` })
    }
}

export const getItemById = async (req, res) => {
    try {
        const itemId = req.params.itemId
        const item = await Item.findById(itemId)
        if (!item) {
            return res.status(400).json({ message: "item not found" })
        }
        return res.status(200).json(item)
    } catch (error) {
        return res.status(500).json({ message: `get item error ${error}` })
    }
}

export const deleteItem = async (req, res) => {
    try {
        const itemId = req.params.itemId
        const shop = await Shop.findOne({ owner: req.userId, items: itemId })
        if (!shop) {
            return res.status(403).json({ message: "you are not allowed to delete this item" })
        }
        if (shop.adminStatus === "suspended") {
            return res.status(403).json({ message: "shop is suspended by admin" })
        }
        const item = await Item.findByIdAndDelete(itemId)
        if (!item) {
            return res.status(400).json({ message: "item not found" })
        }
        shop.items = shop.items.filter((i) => String(i) !== String(item._id))
        await shop.save()
        await shop.populate({
            path: "items",
            options: { sort: { updatedAt: -1 } }
        })
        return res.status(200).json(shop)

    } catch (error) {
        return res.status(500).json({ message: `delete item error ${error}` })
    }
}

export const getItemByCity = async (req, res) => {
    try {
        const { city } = req.params
        if (!city) {
            return res.status(400).json({ message: "city is required" })
        }
        const shops = await Shop.find({
            city: { $regex: new RegExp(`^${city}$`, "i") },
            adminStatus: { $ne: "suspended" }
        }).populate('items')
        if (!shops) {
            return res.status(400).json({ message: "shops not found" })
        }
        const shopIds=shops.map((shop)=>shop._id)

        const items=await Item.find({shop:{$in:shopIds}, inStock: { $ne: false }})
        return res.status(200).json(items)

    } catch (error) {
 return res.status(500).json({ message: `get item by city error ${error}` })
    }
}

export const getItemsByShop=async (req,res) => {
    try {
        const {shopId}=req.params
        const [shop, user] = await Promise.all([
            Shop.findById(shopId).populate("items"),
            User.findById(req.userId).select("role")
        ])
        if(!shop){
            return res.status(400).json("shop not found")
        }
        if (shop.adminStatus === "suspended" && !(user?.role === "owner" && String(shop.owner) === String(req.userId))) {
            return res.status(403).json({ message: "shop is currently unavailable" })
        }
        const isOwnerView = user?.role === "owner" && String(shop.owner) === String(req.userId)
        const items = isOwnerView ? shop.items : shop.items.filter((item) => item.inStock !== false)
        return res.status(200).json({
            shop,items
        })
    } catch (error) {
         return res.status(500).json({ message: `get item by shop error ${error}` })
    }
}

export const searchItems=async (req,res) => {
    try {
        const {query,city}=req.query
        if(!query || !city){
            return null
        }
        const shops=await Shop.find({
            city:{$regex:new RegExp(`^${city}$`, "i")},
            adminStatus: { $ne: "suspended" }
        }).populate('items')
        if(!shops){
            return res.status(400).json({message:"shops not found"})
        }
        const shopIds=shops.map(s=>s._id)
        const items=await Item.find({
            shop:{$in:shopIds},
            inStock:{ $ne: false },
            $or:[
              {name:{$regex:query,$options:"i"}},
              {category:{$regex:query,$options:"i"}}  
            ]

        }).populate("shop","name image")

        return res.status(200).json(items)

    } catch (error) {
         return res.status(500).json({ message: `search item  error ${error}` })
    }
}


export const rating=async (req,res) => {
    try {
        const {itemId,rating}=req.body

        if(!itemId || !rating){
            return res.status(400).json({message:"itemId and rating is required"})
        }

        if(rating<1 || rating>5){
             return res.status(400).json({message:"rating must be between 1 to 5"})
        }

        const item=await Item.findById(itemId)
        if(!item){
              return res.status(400).json({message:"item not found"})
        }

        const newCount=item.rating.count + 1
        const newAverage=(item.rating.average*item.rating.count + rating)/newCount

        item.rating.count=newCount
        item.rating.average=newAverage
        await item.save()
return res.status(200).json({rating:item.rating})

    } catch (error) {
         return res.status(500).json({ message: `rating error ${error}` })
    }
}

export const toggleItemAvailability = async (req, res) => {
    try {
        const { itemId } = req.params
        const shop = await Shop.findOne({ owner: req.userId, items: itemId })
        if (!shop) {
            return res.status(403).json({ message: "you are not allowed to update this item" })
        }
        if (shop.adminStatus === "suspended") {
            return res.status(403).json({ message: "shop is suspended by admin" })
        }

        const item = await Item.findById(itemId)
        if (!item) {
            return res.status(400).json({ message: "item not found" })
        }
        const currentlyInStock = item.inStock !== false
        item.inStock = !currentlyInStock
        await item.save()

        const updatedShop = await Shop.findById(shop._id)
            .populate("owner")
            .populate({
                path: "items",
                options: { sort: { updatedAt: -1 } }
            })

        return res.status(200).json({
            message: item.inStock ? "Item marked in stock" : "Item marked out of stock",
            item,
            shop: updatedShop
        })
    } catch (error) {
        return res.status(500).json({ message: `toggle availability error ${error}` })
    }
}
