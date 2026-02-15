import React, { useEffect, useRef, useState } from 'react'
import Nav from './Nav'
import { categories } from '../category'
import CategoryCard from './CategoryCard'
import { FaCircleChevronLeft } from "react-icons/fa6";
import { FaCircleChevronRight } from "react-icons/fa6";
import { useSelector } from 'react-redux';
import FoodCard from './FoodCard';
import { useNavigate } from 'react-router-dom';

const getCurrentTimeSlot = () => {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return "morning"
  if (hour >= 12 && hour < 17) return "afternoon"
  if (hour >= 17 && hour < 21) return "evening"
  return "night"
}

const timeSlotConfig = {
  morning: {
    title: "Morning",
    categories: ["South Indian", "Sandwiches", "Fast Food"],
    keywords: ["idli", "dosa", "upma", "poha", "sandwich", "tea", "coffee", "bread", "roll"]
  },
  afternoon: {
    title: "Afternoon",
    categories: ["Main Course", "North Indian", "South Indian", "Chinese"],
    keywords: ["thali", "rice", "dal", "roti", "biryani", "curry", "meal", "plate"]
  },
  evening: {
    title: "Evening",
    categories: ["Snacks", "Pizza", "Burgers", "Sandwiches", "Fast Food", "Chinese"],
    keywords: ["momo", "noodle", "pizza", "burger", "roll", "chaat", "pakoda", "snack"]
  },
  night: {
    title: "Night",
    categories: ["Main Course", "North Indian", "Chinese", "Desserts"],
    keywords: ["biryani", "fried rice", "curry", "paneer", "chicken", "dessert", "ice cream", "sweet"]
  }
}

const getTimeBasedItems = (items, slot) => {
  if (!Array.isArray(items) || items.length === 0) return []

  const config = timeSlotConfig[slot]
  if (!config) return items

  const matched = items.filter((item) => {
    const itemName = (item?.name || "").toLowerCase()
    const inCategory = config.categories.includes(item?.category)
    const inKeyword = config.keywords.some((keyword) => itemName.includes(keyword))
    return inCategory || inKeyword
  })

  return matched.length > 0 ? matched : items
}

const normalizeCategory = (value) => (value || "").toString().trim().toLowerCase()

function UserDashboard() {
  const {currentCity,shopInMyCity,itemsInMyCity,searchItems,locationPermission,locationError,userData}=useSelector(state=>state.user)
  const cateScrollRef=useRef()
  const shopScrollRef=useRef()
  const suggestedFoodRef = useRef()
  const cateAutoDirectionRef = useRef(1)
  const navigate=useNavigate()
  const [showLeftCateButton,setShowLeftCateButton]=useState(false)
  const [showRightCateButton,setShowRightCateButton]=useState(false)
   const [showLeftShopButton,setShowLeftShopButton]=useState(false)
  const [showRightShopButton,setShowRightShopButton]=useState(false)
  const [updatedItemsList,setUpdatedItemsList]=useState([])
  const [isCateAutoScrollPaused, setIsCateAutoScrollPaused] = useState(false)
  const [timeSlot, setTimeSlot] = useState(getCurrentTimeSlot())
  const [selectedCategory, setSelectedCategory] = useState("All")
  const favoriteItemIds = new Set((userData?.favoriteItems || []).map((favorite) => String(favorite?._id || favorite)))
  const favoriteItemsInCity = (itemsInMyCity || []).filter((item) => favoriteItemIds.has(String(item._id)))

useEffect(() => {
  const updateTimeSlot = () => {
    setTimeSlot(getCurrentTimeSlot())
  }

  updateTimeSlot()
  const intervalId = setInterval(updateTimeSlot, 60000)
  return () => clearInterval(intervalId)
}, [])

const handleFilterByCategory=(category)=>{
setSelectedCategory(category)
if(category=="All"){
  setUpdatedItemsList(getTimeBasedItems(itemsInMyCity, timeSlot))
}else{
  const normalizedCategory = normalizeCategory(category)
  const filteredList=itemsInMyCity?.filter((i)=>normalizeCategory(i?.category)===normalizedCategory)
  setUpdatedItemsList(filteredList)
}

setTimeout(() => {
  suggestedFoodRef?.current?.scrollIntoView({ behavior: "smooth", block: "start" })
}, 120)

}

useEffect(()=>{
setUpdatedItemsList(getTimeBasedItems(itemsInMyCity, timeSlot))
setSelectedCategory("All")
},[itemsInMyCity, timeSlot])


  const updateButton=(ref,setLeftButton,setRightButton)=>{
const element=ref.current
if(element){
setLeftButton(element.scrollLeft>0)
setRightButton(element.scrollLeft+element.clientWidth<element.scrollWidth)

}
  }
  const scrollHandler=(ref,direction)=>{
    if(ref.current){
      ref.current.scrollBy({
        left:direction=="left"?-200:200,
        behavior:"smooth"
      })
    }
  }




  useEffect(()=>{
    const cateElement = cateScrollRef.current
    const shopElement = shopScrollRef.current
    if(!cateElement || !shopElement) return

    const handleCateScroll = () => {
      updateButton(cateScrollRef,setShowLeftCateButton,setShowRightCateButton)
    }
    const handleShopScroll = () => {
      updateButton(shopScrollRef,setShowLeftShopButton,setShowRightShopButton)
    }

    handleCateScroll()
    handleShopScroll()
    cateElement.addEventListener('scroll', handleCateScroll)
    shopElement.addEventListener('scroll', handleShopScroll)

    return ()=>{
      cateElement.removeEventListener("scroll", handleCateScroll)
      shopElement.removeEventListener("scroll", handleShopScroll)
    }

  },[])

  useEffect(() => {
    const cateElement = cateScrollRef.current
    if (!cateElement) return

    const intervalId = setInterval(() => {
      if (isCateAutoScrollPaused) return

      const maxScrollLeft = cateElement.scrollWidth - cateElement.clientWidth
      if (maxScrollLeft <= 0) return

      const step = 220
      let nextLeft = cateElement.scrollLeft + step * cateAutoDirectionRef.current

      if (nextLeft >= maxScrollLeft) {
        nextLeft = maxScrollLeft
        cateAutoDirectionRef.current = -1
      } else if (nextLeft <= 0) {
        nextLeft = 0
        cateAutoDirectionRef.current = 1
      }

      cateElement.scrollTo({
        left: nextLeft,
        behavior: "smooth"
      })
    }, 2500)

    return () => clearInterval(intervalId)
  }, [isCateAutoScrollPaused])


  return (
    <div className='w-screen min-h-screen flex flex-col gap-5 items-center bg-[#fff9f6] overflow-y-auto'>
      <Nav />

      {locationPermission !== "granted" && (
        <div className='w-full max-w-6xl mt-4 px-5'>
          <div className='bg-white border border-orange-100 rounded-2xl p-4 shadow-sm'>
            <h2 className='text-[#ff4d2d] font-semibold'>Enable location to load nearby restaurants and food</h2>
            <p className='text-sm text-gray-600 mt-1'>
              {locationPermission === "loading"
                ? "Requesting location access..."
                : locationError || "Please allow location permission in your browser and refresh the page."}
            </p>
          </div>
        </div>
      )}

      {searchItems && searchItems.length>0 && (
        <div className='w-full max-w-6xl flex flex-col gap-5 items-start p-5 bg-white shadow-md rounded-2xl mt-4'>
<h1 className='text-gray-900 text-2xl sm:text-3xl font-semibold border-b border-gray-200 pb-2'>
  Search Results
</h1>
<div className='w-full h-auto flex flex-wrap gap-6 justify-center'>
  {searchItems.map((item)=>(
    <FoodCard data={item} key={item._id}/>
  ))}
</div>
        </div>
      )}

      <div className="w-full max-w-6xl flex flex-col gap-5 items-start p-[10px]">
        {favoriteItemsInCity.length > 0 && (
          <div className='w-full flex flex-col gap-4 items-start'>
            <h1 className='text-gray-800 text-2xl sm:text-3xl'>Your Favorites</h1>
            <div className='w-full h-auto flex flex-wrap gap-[20px] justify-center'>
              {favoriteItemsInCity.map((item, index) => (
                <FoodCard key={`fav_${index}`} data={item} />
              ))}
            </div>
          </div>
        )}

        <h1 className='text-gray-800 text-2xl sm:text-3xl'>Inspiration for your first order</h1>
        <div className='w-full relative'>
          {showLeftCateButton &&  <button className='absolute left-0 top-1/2 -translate-y-1/2 bg-[#ff4d2d] text-white p-2 rounded-full shadow-lg hover:bg-[#e64528] z-10' onClick={()=>scrollHandler(cateScrollRef,"left")}><FaCircleChevronLeft />
          </button>}
         

          <div className='w-full flex overflow-x-auto gap-4 pb-2 ' ref={cateScrollRef} onMouseEnter={() => setIsCateAutoScrollPaused(true)} onMouseLeave={() => setIsCateAutoScrollPaused(false)} onTouchStart={() => setIsCateAutoScrollPaused(true)} onTouchEnd={() => setIsCateAutoScrollPaused(false)}>
            {categories.map((cate, index) => (
              <CategoryCard name={cate.category} image={cate.image} key={index} onClick={()=>handleFilterByCategory(cate.category)}/>
            ))}
          </div>
          {showRightCateButton &&  <button className='absolute right-0 top-1/2 -translate-y-1/2 bg-[#ff4d2d] text-white p-2 rounded-full shadow-lg hover:bg-[#e64528] z-10' onClick={()=>scrollHandler(cateScrollRef,"right")}>
<FaCircleChevronRight />
          </button>}
         
        </div>
      </div>

      <div className='w-full max-w-6xl flex flex-col gap-5 items-start p-[10px]'>
 <h1 className='text-gray-800 text-2xl sm:text-3xl'>Best Shop in {currentCity || "your city"}</h1>
 <div className='w-full relative'>
          {showLeftShopButton &&  <button className='absolute left-0 top-1/2 -translate-y-1/2 bg-[#ff4d2d] text-white p-2 rounded-full shadow-lg hover:bg-[#e64528] z-10' onClick={()=>scrollHandler(shopScrollRef,"left")}><FaCircleChevronLeft />
          </button>}
         

          <div className='w-full flex overflow-x-auto gap-4 pb-2 ' ref={shopScrollRef}>
            {shopInMyCity?.map((shop, index) => (
              <CategoryCard name={shop.name} image={shop.image} key={index} onClick={()=>navigate(`/shop/${shop._id}`)}/>
            ))}
          </div>
          {showRightShopButton &&  <button className='absolute right-0 top-1/2 -translate-y-1/2 bg-[#ff4d2d] text-white p-2 rounded-full shadow-lg hover:bg-[#e64528] z-10' onClick={()=>scrollHandler(shopScrollRef,"right")}>
<FaCircleChevronRight />
          </button>}
         
        </div>
      </div>

      <div className='w-full max-w-6xl flex flex-col gap-5 items-start p-[10px]' ref={suggestedFoodRef}>
       <h1 className='text-gray-800 text-2xl sm:text-3xl'>
        Suggested Food Items for {timeSlotConfig[timeSlot]?.title}
        {selectedCategory !== "All" ? ` - ${selectedCategory}` : ""}
       </h1>

<div className='w-full h-auto flex flex-wrap gap-[20px] justify-center'>
{updatedItemsList?.map((item,index)=>(
  <FoodCard key={index} data={item}/>
))}
{updatedItemsList?.length===0 && (
  <p className='text-gray-500 text-lg'>No food items found for this category right now.</p>
)}
</div>


      </div>


    </div>
  )
}

export default UserDashboard
