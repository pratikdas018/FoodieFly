import React from 'react'
import { useSelector } from 'react-redux'
import UserDashboard from '../components/UserDashboard'
import OwnerDashboard from '../components/OwnerDashboard'
import DeliveryBoy from '../components/DeliveryBoy'
import AdminDashboard from '../components/AdminDashboard'

function Home() {
    const {userData}=useSelector(state=>state.user)
    if (userData.role=="admin") {
      return <AdminDashboard/>
    }
  return (
    <div className='w-full min-h-screen pt-[100px] flex flex-col items-center bg-[#fff9f6] overflow-x-hidden'>
      {userData.role=="user" && <UserDashboard/>}
      {userData.role=="owner" && <OwnerDashboard/>}
      {userData.role=="deliveryBoy" && <DeliveryBoy/>}
    </div>
  )
}

export default Home
