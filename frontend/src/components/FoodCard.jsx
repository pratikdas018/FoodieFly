import React, { useState } from 'react'
import { FaLeaf } from "react-icons/fa";
import { FaDrumstickBite } from "react-icons/fa";
import { FaStar } from "react-icons/fa";
import { FaRegStar } from "react-icons/fa6";
import { FaMinus } from "react-icons/fa";
import { FaPlus } from "react-icons/fa";
import { FaShoppingCart } from "react-icons/fa";
import { useDispatch, useSelector } from 'react-redux';
import { addToCart, setUserData } from '../redux/userSlice';
import { IoHeart, IoHeartOutline } from "react-icons/io5";
import axios from 'axios';
import { serverUrl } from '../App';

function FoodCard({data}) {
const [quantity,setQuantity]=useState(0)
const [isFavoriteLoading, setIsFavoriteLoading] = useState(false)
const dispatch=useDispatch()
const {cartItems, userData}=useSelector(state=>state.user)
const favoriteIds = new Set((userData?.favoriteItems || []).map((favorite) => String(favorite?._id || favorite)))
const isFavorite = favoriteIds.has(String(data._id))
    const renderStars=(rating)=>{   //r=3
        const stars=[];
        for (let i = 1; i <= 5; i++) {
           stars.push(
            (i<=rating)?(
                <FaStar className='text-yellow-500 text-lg'/>
            ):(
                <FaRegStar className='text-yellow-500 text-lg'/>
            )
           )
            
        }
return stars
    }

const handleIncrease=()=>{
    const newQty=quantity+1
    setQuantity(newQty)
}
const handleDecrease=()=>{
    if(quantity>0){
const newQty=quantity-1
    setQuantity(newQty)
    }
    
}

const handleToggleFavorite = async () => {
    if (isFavoriteLoading) return
    setIsFavoriteLoading(true)
    try {
      const result = await axios.post(`${serverUrl}/api/user/toggle-favorite/${data._id}`, {}, { withCredentials: true })
      dispatch(setUserData(result.data.user))
    } catch (error) {
      console.log(error)
    } finally {
      setIsFavoriteLoading(false)
    }
}

  return (
    <div className='w-[250px] rounded-2xl border-2 border-[#ff4d2d] bg-white shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col'>
      <div className='relative w-full h-[170px] flex justify-center items-center bg-white'>
        <button className='absolute top-3 left-3 bg-white rounded-full p-1 shadow z-10 disabled:opacity-50' onClick={handleToggleFavorite} disabled={isFavoriteLoading}>
          {isFavorite ? <IoHeart className='text-[#ff4d2d] text-lg' /> : <IoHeartOutline className='text-[#ff4d2d] text-lg' />}
        </button>
        <div className='absolute top-3 right-3 bg-white rounded-full p-1 shadow'>{data.foodType=="veg"?<FaLeaf className='text-green-600 text-lg'/>:<FaDrumstickBite className='text-red-600 text-lg'/>}</div>


<img src={data.image} alt="" className='w-full h-full object-cover transition-transform duration-300 hover:scale-105'/>
      </div>

      <div className="flex-1 flex flex-col p-4">
<h1 className='font-semibold text-gray-900 text-base truncate'>{data.name}</h1>

<div className='flex items-center gap-1 mt-1'>
{renderStars(data.rating?.average || 0)}
<span className='text-xs text-gray-500'>
    {data.rating?.count || 0}
</span>
</div>
      </div>

<div className='flex items-center justify-between mt-auto p-3'>
<span className='font-bold text-gray-900 text-lg'>
    ₹{data.price}
</span>

<div className='flex items-center border rounded-full overflow-hidden shadow-sm'>
<button className='px-2 py-1 hover:bg-gray-100 transition' onClick={handleDecrease}>
<FaMinus size={12}/>
</button>
<span>{quantity}</span>
<button className='px-2 py-1 hover:bg-gray-100 transition' onClick={handleIncrease}>
<FaPlus size={12}/>
</button>
<button className={`${cartItems.some(i=>i.id==data._id)?"bg-gray-800":"bg-[#ff4d2d]"} text-white px-3 py-2 transition-colors`}  onClick={()=>{
    quantity>0?dispatch(addToCart({
          id:data._id,
          name:data.name,
          price:data.price,
          image:data.image,
          shop:data.shop,
          quantity,
          foodType:data.foodType
})):null}}>
<FaShoppingCart size={16}/>
</button>
</div>
</div>


    </div>
  )
}

export default FoodCard
