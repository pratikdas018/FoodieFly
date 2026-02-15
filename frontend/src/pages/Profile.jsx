import axios from "axios"
import React, { useEffect, useMemo, useState } from "react"
import { IoIosArrowRoundBack } from "react-icons/io"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"
import { serverUrl } from "../App"
import { setUserData } from "../redux/userSlice"

function Profile() {
  const { userData } = useSelector((state) => state.user)
  const { myShopData } = useSelector((state) => state.owner)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState(userData?.fullName || "")
  const [mobile, setMobile] = useState(userData?.mobile || "")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    setFullName(userData?.fullName || "")
    setMobile(userData?.mobile || "")
  }, [userData?.fullName, userData?.mobile])

  const roleLabel = useMemo(() => {
    if (userData?.role === "admin") return "Admin"
    if (userData?.role === "deliveryBoy") return "Delivery Boy"
    if (userData?.role === "owner") return "Owner"
    return "User"
  }, [userData?.role])

  const handleUpdate = async () => {
    setLoading(true)
    setMessage("")
    setErrorMessage("")
    try {
      const result = await axios.post(`${serverUrl}/api/user/update-profile`, {
        fullName,
        mobile
      }, { withCredentials: true })
      dispatch(setUserData(result.data))
      setMessage("Profile updated successfully.")
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || "Unable to update profile.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#fff9f6] flex justify-center px-4 py-8">
      <div className="w-full max-w-[860px]">
        <div className="flex items-center gap-4 mb-6">
          <button className="z-[10]" onClick={() => navigate("/")}>
            <IoIosArrowRoundBack size={35} className="text-[#ff4d2d]" />
          </button>
          <h1 className="text-2xl font-bold text-start">My Profile</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-md border border-orange-100 p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-[56px] h-[56px] rounded-full bg-[#ff4d2d] text-white flex items-center justify-center text-2xl font-semibold">
              {userData?.fullName?.slice(0, 1) || "U"}
            </div>
            <div>
              <p className="text-xl font-semibold text-gray-800">{userData?.fullName}</p>
              <p className="text-sm text-gray-500">{roleLabel}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Full Name</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff4d2d]" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Mobile</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff4d2d]" value={mobile} onChange={(e) => setMobile(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Email</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-500" value={userData?.email || ""} disabled />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Role</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-500" value={roleLabel} disabled />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Loyalty Points</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-600 font-semibold" value={userData?.loyaltyPoints ?? 0} disabled />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">My Referral Code</label>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-600 font-semibold" value={userData?.referralCode || "-"} disabled />
            </div>
          </div>

          {userData?.role === "owner" && (
            <div className="rounded-xl border border-orange-100 p-4 bg-orange-50">
              <h2 className="font-semibold text-[#ff4d2d] mb-2">Owner Details</h2>
              {myShopData ? (
                <div className="text-sm text-gray-700 space-y-1">
                  <p><span className="font-semibold">Restaurant:</span> {myShopData.name}</p>
                  <p><span className="font-semibold">City:</span> {myShopData.city}</p>
                  <p><span className="font-semibold">Address:</span> {myShopData.address}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-600">No restaurant added yet.</p>
              )}
            </div>
          )}

          {userData?.role === "deliveryBoy" && (
            <div className="rounded-xl border border-orange-100 p-4 bg-orange-50">
              <h2 className="font-semibold text-[#ff4d2d] mb-2">Delivery Details</h2>
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Current Location:</span>{" "}
                {userData?.location?.coordinates?.length === 2
                  ? `${userData.location.coordinates[1]}, ${userData.location.coordinates[0]}`
                  : "Not available"}
              </p>
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Status:</span> {userData?.isOnline ? "Online" : "Offline"}
              </p>
            </div>
          )}

          {message && <p className="text-green-600 text-sm font-medium">{message}</p>}
          {errorMessage && <p className="text-red-500 text-sm font-medium">{errorMessage}</p>}

          <div className="flex justify-end">
            <button className="bg-[#ff4d2d] hover:bg-[#e64526] text-white px-5 py-2 rounded-lg font-medium disabled:opacity-60" onClick={handleUpdate} disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile
