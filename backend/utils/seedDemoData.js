import dotenv from "dotenv"
import bcrypt from "bcryptjs"
import mongoose from "mongoose"
import connectDb from "../config/db.js"
import Item from "../models/item.model.js"
import Shop from "../models/shop.model.js"
import User from "../models/user.model.js"

dotenv.config()

const DEMO_PASSWORD = "demo1234"

const demoShops = [
    {
        owner: {
            fullName: "Rahul Verma",
            email: "demo.owner1@foodiefly.com",
            mobile: "9000000001"
        },
        shop: {
            name: "FoodieFly Demo Kitchen",
            image: "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=80",
            city: "Baruipur",
            state: "West Bengal",
            address: "21 Market Road, Baruipur"
        },
        items: [
            { name: "Classic Veg Burger", category: "Burgers", price: 129, foodType: "veg", rating: { average: 4.4, count: 186 }, image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1000&q=80" },
            { name: "Chicken Cheese Burger", category: "Burgers", price: 169, foodType: "non veg", rating: { average: 4.6, count: 241 }, image: "https://images.unsplash.com/photo-1586816001966-79b736744398?auto=format&fit=crop&w=1000&q=80" },
            { name: "Margherita Pizza", category: "Pizza", price: 249, foodType: "veg", rating: { average: 4.5, count: 154 }, image: "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=1000&q=80" },
            { name: "Paneer Tikka Pizza", category: "Pizza", price: 299, foodType: "veg", rating: { average: 4.3, count: 119 }, image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1000&q=80" },
            { name: "Hakka Noodles", category: "Chinese", price: 159, foodType: "veg", rating: { average: 4.2, count: 205 }, image: "https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?auto=format&fit=crop&w=1000&q=80" },
            { name: "Chicken Momos", category: "Snacks", price: 149, foodType: "non veg", rating: { average: 4.7, count: 278 }, image: "https://images.unsplash.com/photo-1701563094249-6f8b6c9e3f57?auto=format&fit=crop&w=1000&q=80" },
            { name: "Chocolate Brownie", category: "Desserts", price: 119, foodType: "veg", rating: { average: 4.5, count: 132 }, image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=1000&q=80" },
            { name: "Mango Shake", category: "Others", price: 99, foodType: "veg", rating: { average: 4.1, count: 91 }, image: "https://images.unsplash.com/photo-1638176066666-ffb2f013c7dd?auto=format&fit=crop&w=1000&q=80" }
        ]
    },
    {
        owner: {
            fullName: "Sana Khan",
            email: "demo.owner2@foodiefly.com",
            mobile: "9000000002"
        },
        shop: {
            name: "Spice Route House",
            image: "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=1200&q=80",
            city: "Baruipur",
            state: "West Bengal",
            address: "7 Station Lane, Baruipur"
        },
        items: [
            { name: "Butter Paneer", category: "North Indian", price: 219, foodType: "veg", rating: { average: 4.6, count: 233 }, image: "https://images.unsplash.com/photo-1631452180539-96aca7d48617?auto=format&fit=crop&w=1000&q=80" },
            { name: "Chicken Biryani", category: "Main Course", price: 249, foodType: "non veg", rating: { average: 4.7, count: 301 }, image: "https://images.unsplash.com/photo-1563379091339-03246963d96c?auto=format&fit=crop&w=1000&q=80" },
            { name: "Masala Dosa", category: "South Indian", price: 139, foodType: "veg", rating: { average: 4.3, count: 188 }, image: "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=1000&q=80" },
            { name: "Veg Thali", category: "Main Course", price: 179, foodType: "veg", rating: { average: 4.2, count: 145 }, image: "https://images.unsplash.com/photo-1613292443284-8d10ef9383fe?auto=format&fit=crop&w=1000&q=80" },
            { name: "Chicken Kebab", category: "Fast Food", price: 199, foodType: "non veg", rating: { average: 4.5, count: 164 }, image: "https://images.unsplash.com/photo-1608039755401-742074f0548d?auto=format&fit=crop&w=1000&q=80" },
            { name: "Paneer Roll", category: "Sandwiches", price: 129, foodType: "veg", rating: { average: 4.1, count: 97 }, image: "https://images.unsplash.com/photo-1603360946369-dc9bb6258143?auto=format&fit=crop&w=1000&q=80" },
            { name: "Gulab Jamun", category: "Desserts", price: 89, foodType: "veg", rating: { average: 4.4, count: 116 }, image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1000&q=80" },
            { name: "Veg Fried Rice", category: "Chinese", price: 169, foodType: "veg", rating: { average: 4.0, count: 83 }, image: "https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?auto=format&fit=crop&w=1000&q=80" }
        ]
    }
]

const ensureOwner = async (ownerData, hashedPassword) => {
    const existing = await User.findOne({ email: ownerData.email })
    if (existing) {
        existing.fullName = ownerData.fullName
        existing.mobile = ownerData.mobile
        existing.role = "owner"
        existing.accountStatus = "active"
        if (!existing.password) {
            existing.password = hashedPassword
        }
        await existing.save()
        return existing
    }
    return User.create({
        ...ownerData,
        role: "owner",
        password: hashedPassword,
        accountStatus: "active"
    })
}

const seedOneShop = async (entry, hashedPassword) => {
    const owner = await ensureOwner(entry.owner, hashedPassword)
    let shop = await Shop.findOne({ owner: owner._id, name: entry.shop.name })
    if (!shop) {
        shop = await Shop.create({
            ...entry.shop,
            owner: owner._id,
            adminStatus: "active"
        })
    } else {
        shop.name = entry.shop.name
        shop.image = entry.shop.image
        shop.city = entry.shop.city
        shop.state = entry.shop.state
        shop.address = entry.shop.address
        shop.adminStatus = "active"
        await shop.save()
    }

    await Item.deleteMany({ shop: shop._id })
    const createdItems = await Item.insertMany(entry.items.map((item) => ({
        ...item,
        inStock: true,
        shop: shop._id
    })))
    shop.items = createdItems.map((item) => item._id)
    await shop.save()

    return {
        shopName: shop.name,
        ownerEmail: owner.email,
        itemCount: createdItems.length
    }
}

const run = async () => {
    try {
        await connectDb()
        const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10)
        const results = []

        for (const entry of demoShops) {
            const seeded = await seedOneShop(entry, hashedPassword)
            results.push(seeded)
        }

        console.log("Demo data seeded successfully.")
        results.forEach((result) => {
            console.log(`- ${result.shopName} | owner: ${result.ownerEmail} | items: ${result.itemCount}`)
        })
        console.log(`Demo owner password: ${DEMO_PASSWORD}`)
    } catch (error) {
        console.error("seed demo data error", error)
        process.exitCode = 1
    } finally {
        await mongoose.connection.close()
    }
}

run()
