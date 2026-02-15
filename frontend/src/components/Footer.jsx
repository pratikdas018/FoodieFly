import React from "react"
import { Link } from "react-router-dom"

function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="w-full mt-10 border-t border-orange-100 bg-white">
      <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="text-center md:text-left">
          <p className="text-lg font-semibold text-[#ff4d2d]">FoodieFly</p>
          <p className="text-sm text-gray-500">Real-time food delivery</p>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-600">
          <Link to="/" className="hover:text-[#ff4d2d]">Home</Link>
          <Link to="/my-orders" className="hover:text-[#ff4d2d]">My Orders</Link>
          <Link to="/profile" className="hover:text-[#ff4d2d]">Profile</Link>
        </div>

        <p className="text-xs text-gray-500">Copyright {year} FoodieFly. All rights reserved.</p>
      </div>
    </footer>
  )
}

export default Footer
