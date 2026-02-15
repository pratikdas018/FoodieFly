import React, { useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { IoIosArrowRoundBack } from "react-icons/io";
import { useNavigate } from 'react-router-dom';
import UserOrderCard from '../components/UserOrderCard';
import OwnerOrderCard from '../components/OwnerOrderCard';
import { addMyOrder, updateRealtimeOrderStatus } from '../redux/userSlice';
import DeliveryBoyOrderCard from '../components/DeliveryBoyOrderCard';


function MyOrders() {
  const { userData, myOrders,socket} = useSelector(state => state.user)
  const navigate = useNavigate()
  const dispatch=useDispatch()
  const sortedOrders = useMemo(() => {
    return [...(myOrders || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }, [myOrders])

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" })
  }, [])

  useEffect(()=>{
    if (!socket) return
    const handleNewOrder = (data) => {
      if (data.shopOrders?.owner?._id == userData?._id) {
        dispatch(addMyOrder(data))
      }
    }

    const handleStatusUpdate = ({orderId,shopId,status,userId}) => {
      if(userId == userData?._id){
        dispatch(updateRealtimeOrderStatus({orderId,shopId,status}))
      }
    }

    socket.on('newOrder', handleNewOrder)
    socket.on('update-status', handleStatusUpdate)

    return ()=>{
      socket.off('newOrder', handleNewOrder)
      socket.off('update-status', handleStatusUpdate)
    }
  },[socket, dispatch, userData?._id])



  
  return (
    <div className='w-full min-h-screen bg-[#fff9f6] flex justify-center px-4'>
      <div className='w-full max-w-[800px] p-4'>

        <div className='flex items-center gap-[20px] mb-6 '>
          <div className=' z-[10] ' onClick={() => navigate("/")}>
            <IoIosArrowRoundBack size={35} className='text-[#ff4d2d]' />
          </div>
          <h1 className='text-2xl font-bold  text-start'>My Orders</h1>
        </div>
        <div className='space-y-6'>
          {sortedOrders?.map((order,index)=>(
            userData?.role=="user" ?
            (
              <UserOrderCard data={order} key={`${order._id}_${index}`}/>
            )
            :
            userData?.role=="owner"? (
              <OwnerOrderCard data={order} key={`${order._id}_${index}`}/>
            )
            : userData?.role=="deliveryBoy" ? (
              <DeliveryBoyOrderCard data={order} key={`${order._id}_${index}`}/>
            ) : null
          ))}
          {sortedOrders?.length === 0 && (
            <p className='text-gray-500 text-center'>No orders found.</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default MyOrders
