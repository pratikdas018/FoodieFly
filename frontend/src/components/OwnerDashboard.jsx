import React, { useEffect, useState } from 'react'
import Nav from './Nav'
import { useSelector } from 'react-redux'
import { FaUtensils } from "react-icons/fa";
import { useNavigate } from 'react-router-dom';
import { FaPen } from "react-icons/fa";
import OwnerItemCard from './OwnerItemCard';
import axios from 'axios';
import { serverUrl } from '../App';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
function OwnerDashboard() {
  const { myShopData } = useSelector(state => state.owner)
  const navigate = useNavigate()
  const [analytics, setAnalytics] = useState(null)

  const handleGetAnalytics = async () => {
    try {
      const result = await axios.get(`${serverUrl}/api/order/owner-analytics`, { withCredentials: true })
      setAnalytics(result.data)
    } catch (error) {
      console.log(error)
    }
  }

  useEffect(() => {
    if (!myShopData) return
    handleGetAnalytics()
  }, [myShopData?._id, myShopData?.items?.length])

  
  return (
    <div className='w-full min-h-screen bg-[#fff9f6] flex flex-col items-center'>
      <Nav />
      {!myShopData &&
        <div className='flex justify-center items-center p-4 sm:p-6'>
          <div className='w-full max-w-md bg-white shadow-lg rounded-2xl p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300'>
            <div className='flex flex-col items-center text-center'>
              <FaUtensils className='text-[#ff4d2d] w-16 h-16 sm:w-20 sm:h-20 mb-4' />
              <h2 className='text-xl sm:text-2xl font-bold text-gray-800 mb-2'>Add Your Restaurant</h2>
              <p className='text-gray-600 mb-4 text-sm sm:text-base'>Join our food delivery platform and reach thousands of hungry customers every day.
              </p>
              <button className='bg-[#ff4d2d] text-white px-5 sm:px-6 py-2 rounded-full font-medium shadow-md hover:bg-orange-600 transition-colors duration-200' onClick={() => navigate("/create-edit-shop")}>
                Get Started
              </button>
            </div>
          </div>
        </div>
      }

      {myShopData &&
        <div className='w-full flex flex-col items-center gap-6 px-4 sm:px-6'>
          <h1 className='text-2xl sm:text-3xl text-gray-900 flex items-center gap-3 mt-8 text-center'><FaUtensils className='text-[#ff4d2d] w-14 h-14 ' />Welcome to {myShopData.name}</h1>

          <div className='bg-white shadow-lg rounded-xl overflow-hidden border border-orange-100 hover:shadow-2xl transition-all duration-300 w-full max-w-3xl relative'>
            <div className='absolute top-4 right-4 bg-[#ff4d2d] text-white p-2 rounded-full shadow-md hover:bg-orange-600 transition-colors cursor-pointer' onClick={()=>navigate("/create-edit-shop")}>
<FaPen size={20}/>
            </div>
             <img src={myShopData.image} alt={myShopData.name} className='w-full h-48 sm:h-64 object-cover'/>
             <div className='p-4 sm:p-6'>
              <h1 className='text-xl sm:text-2xl font-bold text-gray-800 mb-2'>{myShopData.name}</h1>
              <p className='text-gray-500 '>{myShopData.city},{myShopData.state}</p>
              <p className='text-gray-500 mb-4'>{myShopData.address}</p>
            </div>
          </div>

          {myShopData.items.length==0 && 
            <div className='flex justify-center items-center p-4 sm:p-6'>
          <div className='w-full max-w-md bg-white shadow-lg rounded-2xl p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300'>
            <div className='flex flex-col items-center text-center'>
              <FaUtensils className='text-[#ff4d2d] w-16 h-16 sm:w-20 sm:h-20 mb-4' />
              <h2 className='text-xl sm:text-2xl font-bold text-gray-800 mb-2'>Add Your Food Item</h2>
              <p className='text-gray-600 mb-4 text-sm sm:text-base'>Share your delicious creations with our customers by adding them to the menu.
              </p>
              <button className='bg-[#ff4d2d] text-white px-5 sm:px-6 py-2 rounded-full font-medium shadow-md hover:bg-orange-600 transition-colors duration-200' onClick={() => navigate("/add-item")}>
              Add Food
              </button>
            </div>
          </div>
        </div>
            }

            {analytics && (
              <div className='w-full max-w-5xl bg-white rounded-2xl border border-orange-100 shadow-md p-5'>
                <h2 className='text-xl font-bold text-gray-800 mb-4'>Owner Analytics</h2>
                <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6'>
                  <div className='rounded-xl border border-orange-100 p-4 bg-orange-50'>
                    <p className='text-xs text-gray-600'>Total Orders</p>
                    <p className='text-2xl font-bold text-[#ff4d2d]'>{analytics.summary?.totalOrders || 0}</p>
                  </div>
                  <div className='rounded-xl border border-green-100 p-4 bg-green-50'>
                    <p className='text-xs text-gray-600'>Delivered Sales</p>
                    <p className='text-2xl font-bold text-green-700'>INR {analytics.summary?.deliveredSales || 0}</p>
                  </div>
                  <div className='rounded-xl border border-blue-100 p-4 bg-blue-50'>
                    <p className='text-xs text-gray-600'>Conversion Rate</p>
                    <p className='text-2xl font-bold text-blue-700'>{analytics.summary?.conversionRate || 0}%</p>
                  </div>
                  <div className='rounded-xl border border-red-100 p-4 bg-red-50'>
                    <p className='text-xs text-gray-600'>Cancellation Rate</p>
                    <p className='text-2xl font-bold text-red-600'>{analytics.summary?.cancellationRate || 0}%</p>
                  </div>
                </div>

                <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
                  <div className='rounded-xl border p-4'>
                    <h3 className='font-semibold text-gray-800 mb-3'>Hourly Sales</h3>
                    <ResponsiveContainer width="100%" height={240}>
                      <LineChart data={analytics.hourlySales || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="hour" tickFormatter={(hour) => `${hour}:00`} />
                        <YAxis />
                        <Tooltip formatter={(value) => [`INR ${value}`, "Sales"]} labelFormatter={(label) => `${label}:00`} />
                        <Line type="monotone" dataKey="sales" stroke="#ff4d2d" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className='rounded-xl border p-4'>
                    <h3 className='font-semibold text-gray-800 mb-3'>Top Items</h3>
                    {(analytics.topItems || []).length > 0 ? (
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={(analytics.topItems || []).slice(0, 6)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" interval={0} angle={-15} textAnchor="end" height={55} />
                          <YAxis allowDecimals={false} />
                          <Tooltip formatter={(value) => [value, "Quantity"]} />
                          <Bar dataKey="quantity" fill="#ff4d2d" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className='text-sm text-gray-500'>No item sales data yet.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {myShopData.items.length>0 && <div className='flex flex-col items-center gap-4 w-full max-w-3xl '>
              {myShopData.items.map((item,index)=>(
                <OwnerItemCard data={item} key={index}/>
              ))}
              </div>}
            
        </div>}



    </div>
  )
}

export default OwnerDashboard
