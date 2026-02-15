import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { IoIosArrowRoundBack } from "react-icons/io";
import { serverUrl } from '../App';
import FoodCard from '../components/FoodCard';
import { useSelector } from 'react-redux';

function Favorites() {
  const navigate = useNavigate()
  const { userData } = useSelector((state) => state.user)
  const [favoriteItems, setFavoriteItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchFavoriteItems = async () => {
      try {
        const result = await axios.get(`${serverUrl}/api/user/favorites`, { withCredentials: true })
        setFavoriteItems(Array.isArray(result.data) ? result.data : [])
      } catch (error) {
        console.log(error)
        setFavoriteItems([])
      } finally {
        setLoading(false)
      }
    }

    fetchFavoriteItems()
  }, [userData?.favoriteItems?.length])

  return (
    <div className='w-full min-h-screen bg-[#fff9f6] flex justify-center px-4'>
      <div className='w-full max-w-6xl p-4'>
        <div className='flex items-center gap-[20px] mb-6'>
          <div className='z-[10] cursor-pointer' onClick={() => navigate("/")}>
            <IoIosArrowRoundBack size={35} className='text-[#ff4d2d]' />
          </div>
          <h1 className='text-2xl font-bold text-start'>My Favorites</h1>
        </div>

        {loading ? (
          <p className='text-gray-500 text-center py-10'>Loading favorite foods...</p>
        ) : favoriteItems.length > 0 ? (
          <div className='w-full h-auto flex flex-wrap gap-[20px] justify-center'>
            {favoriteItems.map((item) => (
              <FoodCard key={item._id} data={item} />
            ))}
          </div>
        ) : (
          <p className='text-gray-500 text-center py-10'>No favorite foods found. Tap heart on food cards to add favorites.</p>
        )}
      </div>
    </div>
  )
}

export default Favorites
