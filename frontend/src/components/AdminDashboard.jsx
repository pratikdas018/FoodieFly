import axios from "axios"
import React, { useEffect, useMemo, useState } from "react"
import { serverUrl } from "../App"
import Nav from "./Nav"

function AdminDashboard() {
  const [overview, setOverview] = useState(null)
  const [users, setUsers] = useState([])
  const [shops, setShops] = useState([])
  const [deliveryPartners, setDeliveryPartners] = useState([])
  const [disputes, setDisputes] = useState([])
  const [activeTab, setActiveTab] = useState("users")
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const roleOptions = useMemo(() => ["user", "owner", "deliveryBoy"], [])

  const fetchOverview = async () => {
    const result = await axios.get(`${serverUrl}/api/admin/overview`, { withCredentials: true })
    setOverview(result.data)
  }

  const fetchUsers = async () => {
    const result = await axios.get(`${serverUrl}/api/admin/users?limit=100`, { withCredentials: true })
    setUsers(result.data?.users || [])
  }

  const fetchShops = async () => {
    const result = await axios.get(`${serverUrl}/api/admin/shops?limit=100`, { withCredentials: true })
    setShops(result.data?.shops || [])
  }

  const fetchDelivery = async () => {
    const result = await axios.get(`${serverUrl}/api/admin/delivery`, { withCredentials: true })
    setDeliveryPartners(result.data || [])
  }

  const fetchDisputes = async () => {
    const result = await axios.get(`${serverUrl}/api/admin/disputes?limit=100`, { withCredentials: true })
    setDisputes(result.data?.disputes || [])
  }

  const loadAll = async () => {
    setLoading(true)
    setErrorMessage("")
    try {
      await Promise.all([fetchOverview(), fetchUsers(), fetchShops(), fetchDelivery(), fetchDisputes()])
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || "Unable to load admin data.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  const handleUpdateUserStatus = async (userId, status) => {
    try {
      await axios.patch(`${serverUrl}/api/admin/users/${userId}/status`, { status }, { withCredentials: true })
      await Promise.all([fetchOverview(), fetchUsers(), fetchShops(), fetchDelivery()])
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || "Unable to update user status.")
    }
  }

  const handleUpdateUserRole = async (userId, role) => {
    try {
      await axios.patch(`${serverUrl}/api/admin/users/${userId}/role`, { role }, { withCredentials: true })
      await fetchUsers()
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || "Unable to update role.")
    }
  }

  const handleUpdateShopStatus = async (shopId, status) => {
    try {
      await axios.patch(`${serverUrl}/api/admin/shops/${shopId}/status`, { status }, { withCredentials: true })
      await Promise.all([fetchOverview(), fetchShops()])
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || "Unable to update shop status.")
    }
  }

  const handleUpdateDispute = async (disputeId, status) => {
    let resolutionNote = ""
    if (status === "resolved" || status === "rejected") {
      resolutionNote = window.prompt("Resolution note") || ""
      if (resolutionNote.trim().length < 3) {
        setErrorMessage("Resolution note must be at least 3 characters.")
        return
      }
    }
    try {
      await axios.patch(`${serverUrl}/api/admin/disputes/${disputeId}/status`, {
        status,
        resolutionNote
      }, { withCredentials: true })
      await Promise.all([fetchOverview(), fetchDisputes()])
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || "Unable to update dispute status.")
    }
  }

  return (
    <div className="w-screen min-h-screen bg-[#fff9f6] flex flex-col items-center">
      <Nav />
      <div className="w-full max-w-6xl px-4 py-6 flex flex-col gap-5">
        <h1 className="text-3xl font-bold text-[#ff4d2d]">Admin Panel</h1>
        {errorMessage && <p className="text-red-500 text-sm">{errorMessage}</p>}
        {loading && <p className="text-sm text-gray-500">Loading admin data...</p>}

        {overview && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 border border-orange-100 shadow-sm">
              <p className="text-xs text-gray-500">Total Orders</p>
              <p className="text-2xl font-bold text-[#ff4d2d]">{overview.totalOrders || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Pending Shop Orders: {overview.pendingShopOrders || 0}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-orange-100 shadow-sm">
              <p className="text-xs text-gray-500">Shops</p>
              <p className="text-sm text-gray-700 mt-1">Active: {overview.shops?.active || 0}</p>
              <p className="text-sm text-gray-700">Suspended: {overview.shops?.suspended || 0}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-orange-100 shadow-sm">
              <p className="text-xs text-gray-500">Disputes</p>
              <p className="text-sm text-gray-700 mt-1">Open: {overview.disputes?.open || 0}</p>
              <p className="text-sm text-gray-700">In Review: {overview.disputes?.in_review || 0}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-orange-100 shadow-sm">
              <p className="text-xs text-gray-500">Delivery Assignments</p>
              <p className="text-sm text-gray-700 mt-1">Broadcasted: {overview.deliveryAssignments?.brodcasted || 0}</p>
              <p className="text-sm text-gray-700">Assigned: {overview.deliveryAssignments?.assigned || 0}</p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {[
            { id: "users", label: "Users" },
            { id: "shops", label: "Shops" },
            { id: "delivery", label: "Delivery" },
            { id: "disputes", label: "Disputes" }
          ].map((tab) => (
            <button
              key={tab.id}
              className={`px-4 py-2 rounded-lg border text-sm font-medium ${activeTab === tab.id ? "bg-[#ff4d2d] text-white border-[#ff4d2d]" : "bg-white text-[#ff4d2d] border-[#ff4d2d]"}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "users" && (
          <div className="bg-white rounded-2xl border border-orange-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b font-semibold text-gray-800">User Management</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-orange-50">
                  <tr>
                    <th className="text-left px-3 py-2">Name</th>
                    <th className="text-left px-3 py-2">Role</th>
                    <th className="text-left px-3 py-2">Status</th>
                    <th className="text-left px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id} className="border-t">
                      <td className="px-3 py-2">
                        <p className="font-medium">{user.fullName}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </td>
                      <td className="px-3 py-2 capitalize">
                        <select
                          className="border rounded-md px-2 py-1"
                          value={user.role}
                          onChange={(event) => handleUpdateUserRole(user._id, event.target.value)}
                          disabled={user.role === "admin"}
                        >
                          {user.role === "admin" && <option value="admin">admin</option>}
                          {roleOptions.map((role) => (
                            <option key={role} value={role}>{role}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2 capitalize">{user.accountStatus}</td>
                      <td className="px-3 py-2">
                        {user.role !== "admin" && (
                          <button
                            className={`px-3 py-1 rounded-md text-white ${user.accountStatus === "active" ? "bg-red-500" : "bg-green-600"}`}
                            onClick={() => handleUpdateUserStatus(user._id, user.accountStatus === "active" ? "suspended" : "active")}
                          >
                            {user.accountStatus === "active" ? "Suspend" : "Activate"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-3 text-center text-gray-500">No users found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "shops" && (
          <div className="bg-white rounded-2xl border border-orange-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b font-semibold text-gray-800">Shop Management</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-orange-50">
                  <tr>
                    <th className="text-left px-3 py-2">Shop</th>
                    <th className="text-left px-3 py-2">Owner</th>
                    <th className="text-left px-3 py-2">City</th>
                    <th className="text-left px-3 py-2">Status</th>
                    <th className="text-left px-3 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {shops.map((shop) => (
                    <tr key={shop._id} className="border-t">
                      <td className="px-3 py-2">{shop.name}</td>
                      <td className="px-3 py-2">{shop.owner?.fullName || "-"}</td>
                      <td className="px-3 py-2">{shop.city}</td>
                      <td className="px-3 py-2 capitalize">{shop.adminStatus || "active"}</td>
                      <td className="px-3 py-2">
                        <button
                          className={`px-3 py-1 rounded-md text-white ${(shop.adminStatus || "active") === "active" ? "bg-red-500" : "bg-green-600"}`}
                          onClick={() => handleUpdateShopStatus(shop._id, (shop.adminStatus || "active") === "active" ? "suspended" : "active")}
                        >
                          {(shop.adminStatus || "active") === "active" ? "Suspend" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {shops.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-3 text-center text-gray-500">No shops found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "delivery" && (
          <div className="bg-white rounded-2xl border border-orange-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b font-semibold text-gray-800">Delivery Partner Management</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-orange-50">
                  <tr>
                    <th className="text-left px-3 py-2">Name</th>
                    <th className="text-left px-3 py-2">Status</th>
                    <th className="text-left px-3 py-2">Online</th>
                    <th className="text-left px-3 py-2">Assigned</th>
                    <th className="text-left px-3 py-2">Delivered</th>
                    <th className="text-left px-3 py-2">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveryPartners.map((partner) => (
                    <tr key={partner._id} className="border-t">
                      <td className="px-3 py-2">
                        <p className="font-medium">{partner.fullName}</p>
                        <p className="text-xs text-gray-500">{partner.mobile}</p>
                      </td>
                      <td className="px-3 py-2 capitalize">{partner.accountStatus}</td>
                      <td className="px-3 py-2">{partner.isOnline ? "Yes" : "No"}</td>
                      <td className="px-3 py-2">{partner.stats?.assigned || 0}</td>
                      <td className="px-3 py-2">{partner.stats?.deliveredOrders || 0}</td>
                      <td className="px-3 py-2">INR {partner.stats?.deliveredValue || 0}</td>
                    </tr>
                  ))}
                  {deliveryPartners.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-3 text-center text-gray-500">No delivery partners found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "disputes" && (
          <div className="bg-white rounded-2xl border border-orange-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b font-semibold text-gray-800">Dispute Handling</div>
            <div className="p-4 flex flex-col gap-3">
              {disputes.map((dispute) => (
                <div key={dispute._id} className="border rounded-xl p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-gray-800">
                      Order #{String(dispute.order?._id || "").slice(-6)} | {dispute.raisedByRole}
                    </p>
                    <span className="text-xs px-2 py-1 rounded-full bg-orange-50 text-[#ff4d2d] capitalize">{dispute.status.replace("_", " ")}</span>
                  </div>
                  <p className="text-sm text-gray-700 mt-2"><span className="font-semibold">Reason:</span> {dispute.reason}</p>
                  {dispute.description && <p className="text-sm text-gray-700"><span className="font-semibold">Description:</span> {dispute.description}</p>}
                  <p className="text-xs text-gray-500 mt-1">Raised by {dispute.raisedBy?.fullName || "User"} on {new Date(dispute.createdAt).toLocaleString("en-GB")}</p>
                  {dispute.resolutionNote && <p className="text-sm text-green-700 mt-1"><span className="font-semibold">Resolution:</span> {dispute.resolutionNote}</p>}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button className="px-3 py-1 rounded-md bg-blue-600 text-white text-sm" onClick={() => handleUpdateDispute(dispute._id, "in_review")}>Mark In Review</button>
                    <button className="px-3 py-1 rounded-md bg-green-600 text-white text-sm" onClick={() => handleUpdateDispute(dispute._id, "resolved")}>Resolve</button>
                    <button className="px-3 py-1 rounded-md bg-red-500 text-white text-sm" onClick={() => handleUpdateDispute(dispute._id, "rejected")}>Reject</button>
                  </div>
                </div>
              ))}
              {disputes.length === 0 && <p className="text-sm text-gray-500">No disputes found.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminDashboard
