import express from "express"
import { deleteUserAddress, getCurrentUser, getFavoriteItems, getUserAddresses, saveUserAddress, setDefaultUserAddress, toggleFavoriteItem, updateUserLocation, updateUserProfile } from "../controllers/user.controllers.js"
import isAuth from "../middlewares/isAuth.js"


const userRouter=express.Router()

userRouter.get("/current",isAuth,getCurrentUser)
userRouter.post('/update-profile',isAuth,updateUserProfile)
userRouter.post('/update-location',isAuth,updateUserLocation)
userRouter.post('/toggle-favorite/:itemId',isAuth,toggleFavoriteItem)
userRouter.get('/favorites',isAuth,getFavoriteItems)
userRouter.get('/addresses',isAuth,getUserAddresses)
userRouter.post('/save-address',isAuth,saveUserAddress)
userRouter.post('/set-default-address/:addressId',isAuth,setDefaultUserAddress)
userRouter.delete('/delete-address/:addressId',isAuth,deleteUserAddress)
export default userRouter
