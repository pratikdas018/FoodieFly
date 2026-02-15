import axios from 'axios'
import React, { useEffect } from 'react'
import { serverUrl } from '../App'
import { useSelector } from 'react-redux'

function useUpdateLocation() {
    const {userData, locationPermission}=useSelector(state=>state.user)
 
    useEffect(()=>{
      if (!userData || locationPermission !== "granted") return
      if (!navigator.geolocation) return

      const updateLocation=async (lat,lon) => {
        try {
          await axios.post(`${serverUrl}/api/user/update-location`,{lat,lon},{withCredentials:true})
        } catch (error) {
          console.log(error)
        }
      }

      const watchId = navigator.geolocation.watchPosition(
        (pos)=>{
          updateLocation(pos.coords.latitude,pos.coords.longitude)
        },
        (error) => {
          console.log(error)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      )

      return () => {
        navigator.geolocation.clearWatch(watchId)
      }
    },[userData, locationPermission])
}

export default useUpdateLocation
