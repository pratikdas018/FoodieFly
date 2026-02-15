import React from 'react'
import { useState } from 'react';
import { FaRegEye } from "react-icons/fa";
import { FaRegEyeSlash } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { useNavigate } from 'react-router-dom';
import axios from "axios"
import { serverUrl } from '../App';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../../firebase';
import { ClipLoader } from 'react-spinners';
import { useDispatch } from 'react-redux';
import { setUserData } from '../redux/userSlice';
import { showAppPopup } from '../App';
function SignIn() {
    const primaryColor = "#ff4d2d";
    const hoverColor = "#e64323";
    const bgColor = "#fff9f6";
    const borderColor = "#ddd";
    const [showPassword, setShowPassword] = useState(false)
    const navigate=useNavigate()
    const [email,setEmail]=useState("")
    const [password,setPassword]=useState("")
    const [err,setErr]=useState("")
    const [loading,setLoading]=useState(false)
    const [googleLoading,setGoogleLoading]=useState(false)
    const dispatch=useDispatch()
    const getAuthErrorMessage = (error) => {
      const firebaseCode = error?.code || ""
      if (firebaseCode === "auth/popup-blocked") return "Google popup was blocked. Please allow popups and try again."
      if (firebaseCode === "auth/popup-closed-by-user") return "Google popup was closed before sign in completed."
      if (firebaseCode === "auth/cancelled-popup-request") return "Google sign in request was cancelled. Please try again."
      if (firebaseCode === "auth/unauthorized-domain") return "This domain is not authorized for Google sign in. Add it in Firebase Auth settings."
      return error?.response?.data?.message || error?.message || "Google sign in failed."
    }
     const handleSignIn=async () => {
        setLoading(true)
        try {
            const result=await axios.post(`${serverUrl}/api/auth/signin`,{
                email,password
            },{withCredentials:true})
           dispatch(setUserData(result.data))
           showAppPopup({
            title: "Login Successful",
            message: `Welcome back, ${result.data.fullName || "User"}!`,
            type: "success"
           })
           if (result.data.role === "user") {
            showAppPopup({
              title: "First Order Offer",
              message: "Up to 78% off on your first order. Order now!",
              type: "promo"
            })
           }
            setErr("")
            setLoading(false)
        } catch (error) {
           setErr(error?.response?.data?.message)
           setLoading(false)
        }
     }
     const handleGoogleAuth=async () => {
        setErr("")
        setGoogleLoading(true)
        try {
          const provider=new GoogleAuthProvider()
          const result=await signInWithPopup(auth,provider)
          const {data}=await axios.post(`${serverUrl}/api/auth/google-auth`,{
              email:result.user.email,
          },{withCredentials:true})
          dispatch(setUserData(data))
          showAppPopup({
            title: "Login Successful",
            message: `Welcome back, ${data.fullName || "User"}!`,
            type: "success"
          })
          if (data.role === "user") {
            showAppPopup({
              title: "First Order Offer",
              message: "Up to 78% off on your first order. Order now!",
              type: "promo"
            })
          }
        } catch (error) {
          const message = getAuthErrorMessage(error)
          setErr(message)
          showAppPopup({
            title: "Google Sign In Failed",
            message,
            type: "info"
          })
        } finally {
          setGoogleLoading(false)
        }
     }
    return (
        <div className='min-h-screen w-full flex items-center justify-center p-4' style={{ backgroundColor: bgColor }}>
            <div className={`bg-white rounded-xl shadow-lg w-full max-w-md p-8 border-[1px] `} style={{
                border: `1px solid ${borderColor}`
            }}>
                <h1 className={`text-3xl font-bold mb-2 `} style={{ color: primaryColor }}>FoodieFly</h1>
                <p className='text-gray-600 mb-8'> Sign In to your account to get started with delicious food deliveries
                </p>

              
                {/* email */}

                <div className='mb-4'>
                    <label htmlFor="email" className='block text-gray-700 font-medium mb-1'>Email</label>
                    <input type="email" className='w-full border rounded-lg px-3 py-2 focus:outline-none ' placeholder='Enter your Email' style={{ border: `1px solid ${borderColor}` }} onChange={(e)=>setEmail(e.target.value)} value={email} required/>
                </div>
                {/* password*/}

                <div className='mb-4'>
                    <label htmlFor="password" className='block text-gray-700 font-medium mb-1'>Password</label>
                    <div className='relative'>
                        <input type={`${showPassword ? "text" : "password"}`} className='w-full border rounded-lg px-3 py-2 focus:outline-none pr-10' placeholder='Enter your password' style={{ border: `1px solid ${borderColor}` }} onChange={(e)=>setPassword(e.target.value)} value={password} required/>

                        <button className='absolute right-3 cursor-pointer top-[14px] text-gray-500' onClick={() => setShowPassword(prev => !prev)}>{!showPassword ? <FaRegEye /> : <FaRegEyeSlash />}</button>
                    </div>
                </div>
                <div className='text-right mb-4 cursor-pointer text-[#ff4d2d] font-medium' onClick={()=>navigate("/forgot-password")}>
                  Forgot Password
                </div>
              

            <button className={`w-full font-semibold py-2 rounded-lg transition duration-200 bg-[#ff4d2d] text-white hover:bg-[#e64323] cursor-pointer`} onClick={handleSignIn} disabled={loading}>
                {loading?<ClipLoader size={20} color='white'/>:"Sign In"}
            </button>
      {err && <p className='text-red-500 text-center my-[10px]'>*{err}</p>}

            <button className='w-full mt-4 flex items-center justify-center gap-2 border rounded-lg px-4 py-2 transition cursor-pointer duration-200 border-gray-400 hover:bg-gray-100 disabled:opacity-70 disabled:cursor-not-allowed' onClick={handleGoogleAuth} disabled={googleLoading}>
<FcGoogle size={20}/>
<span>{googleLoading ? "Please wait..." : "Sign In with Google"}</span>
            </button>
            <p className='text-center mt-6 cursor-pointer' onClick={()=>navigate("/signup")}>Want to create a new account ?  <span className='text-[#ff4d2d]'>Sign Up</span></p>
            </div>
        </div>
    )
}

export default SignIn
