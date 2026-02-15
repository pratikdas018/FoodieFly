import axios from 'axios'
import React, { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setCurrentAddress, setCurrentCity, setCurrentState, setLocationError, setLocationPermission } from '../redux/userSlice'
import { setAddress, setLocation } from '../redux/mapSlice'

function useGetCity() {
    const dispatch=useDispatch()
    const {userData}=useSelector(state=>state.user)
    const apiKey=import.meta.env.VITE_GEOAPIKEY
    useEffect(()=>{
      if (!userData || userData.role !== "user") return

      if (!navigator.geolocation) {
        dispatch(setLocationPermission("unsupported"))
        dispatch(setLocationError("Geolocation is not supported by this browser."))
        return
      }

      dispatch(setLocationPermission("loading"))
      dispatch(setLocationError(null))

      navigator.geolocation.getCurrentPosition(
        async (position)=>{
          try {
            const latitude=position.coords.latitude
            const longitude=position.coords.longitude

            dispatch(setLocation({lat:latitude,lon:longitude}))

            const result=await axios.get(`https://api.geoapify.com/v1/geocode/reverse?lat=${latitude}&lon=${longitude}&format=json&apiKey=${apiKey}`)
            const locationData = result?.data?.results?.[0]

            dispatch(setCurrentCity(locationData?.city || locationData?.county || null))
            dispatch(setCurrentState(locationData?.state || null))
            dispatch(setCurrentAddress(locationData?.address_line2 || locationData?.address_line1 || null))
            dispatch(setAddress(locationData?.address_line2 || locationData?.address_line1 || null))
            dispatch(setLocationPermission("granted"))
          } catch (error) {
            dispatch(setCurrentCity(null))
            dispatch(setCurrentState(null))
            dispatch(setCurrentAddress(null))
            dispatch(setLocationPermission("granted"))
            dispatch(setLocationError("Unable to resolve your city from current location."))
          }
        },
        (error) => {
          dispatch(setCurrentCity(null))
          dispatch(setCurrentState(null))
          dispatch(setCurrentAddress(null))
          dispatch(setLocationPermission("denied"))
          dispatch(setLocationError(error?.message || "Location access denied. Please allow location to fetch nearby food."))
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      )
    },[userData, apiKey, dispatch])
}

export default useGetCity
