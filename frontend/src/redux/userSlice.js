import { createSlice } from "@reduxjs/toolkit";

const userSlice = createSlice({
  name: "user",
  initialState: {
    userData: null,
    currentCity: null,
    currentState: null,
    currentAddress: null,
    shopInMyCity: null,
    itemsInMyCity: null,
    cartItems: [],
    totalAmount: 0,
    myOrders: [],
    searchItems: null,
    socket: null,
    locationPermission: "idle",
    locationError: null,
    notifications: []
  },
  reducers: {
    setUserData: (state, action) => {
      state.userData = action.payload
    },
    setCurrentCity: (state, action) => {
      state.currentCity = action.payload
    },
    setCurrentState: (state, action) => {
      state.currentState = action.payload
    },
    setCurrentAddress: (state, action) => {
      state.currentAddress = action.payload
    },
    setShopsInMyCity: (state, action) => {
      state.shopInMyCity = action.payload
    },
    setItemsInMyCity: (state, action) => {
      state.itemsInMyCity = action.payload
    },
    setSocket: (state, action) => {
      state.socket = action.payload
    },
    setCartItems: (state, action) => {
      const inputItems = Array.isArray(action.payload) ? action.payload : []
      const mergedItems = []
      inputItems.forEach((cartItem) => {
        if (!cartItem?.id) return
        const existingItem = mergedItems.find((item) => item.id == cartItem.id)
        if (existingItem) {
          existingItem.quantity += Number(cartItem.quantity || 0)
        } else {
          mergedItems.push({
            ...cartItem,
            quantity: Number(cartItem.quantity || 0)
          })
        }
      })
      state.cartItems = mergedItems.filter((item) => item.quantity > 0)
      state.totalAmount = state.cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0)
    },
    addToCart: (state, action) => {
      const cartItem = action.payload
      const existingItem = state.cartItems.find(i => i.id == cartItem.id)
      if (existingItem) {
        existingItem.quantity += cartItem.quantity
      } else {
        state.cartItems.push(cartItem)
      }

      state.totalAmount = state.cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0)

    },

    setTotalAmount: (state, action) => {
      state.totalAmount = action.payload
    }

    ,

    updateQuantity: (state, action) => {
      const { id, quantity } = action.payload
      const item = state.cartItems.find(i => i.id == id)
      if (item) {
        item.quantity = quantity
      }
      state.totalAmount = state.cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0)
    },

    removeCartItem: (state, action) => {
      state.cartItems = state.cartItems.filter(i => i.id !== action.payload)
      state.totalAmount = state.cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0)
    },

    setMyOrders: (state, action) => {
      state.myOrders = action.payload
    },
    addMyOrder: (state, action) => {
      state.myOrders = [action.payload, ...state.myOrders]
    }

    ,
    updateOrderStatus: (state, action) => {
      const { orderId, shopId, status } = action.payload
      const order = state.myOrders.find(o => o._id == orderId)
      if (order) {
        if (order.shopOrders && order.shopOrders.shop._id == shopId) {
          order.shopOrders.status = status
        }
      }
    },

    updateRealtimeOrderStatus: (state, action) => {
      const { orderId, shopId, status } = action.payload
      const order = state.myOrders.find(o => o._id == orderId)
      if (order) {
        const shopOrder = order.shopOrders.find(so => so.shop._id == shopId)
        if (shopOrder) {
          shopOrder.status = status
        }
      }
    },

    setSearchItems: (state, action) => {
      state.searchItems = action.payload
    },

    setLocationPermission: (state, action) => {
      state.locationPermission = action.payload
    },

    setLocationError: (state, action) => {
      state.locationError = action.payload
    },

    addNotification: (state, action) => {
      const payload = action.payload || {}
      state.notifications = [{
        id: payload.id || `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        title: payload.title || "Notification",
        message: payload.message || "",
        type: payload.type || "info",
        route: payload.route || "/",
        createdAt: payload.createdAt || new Date().toISOString(),
        read: false
      }, ...state.notifications].slice(0, 50)
    },

    markAllNotificationsRead: (state) => {
      state.notifications = state.notifications.map((notification) => ({
        ...notification,
        read: true
      }))
    },

    markNotificationRead: (state, action) => {
      state.notifications = state.notifications.map((notification) => {
        if (notification.id !== action.payload) return notification
        return { ...notification, read: true }
      })
    },

    clearNotifications: (state) => {
      state.notifications = []
    }
  }
})

export const {
  setUserData,
  setCurrentAddress,
  setCurrentCity,
  setCurrentState,
  setShopsInMyCity,
  setItemsInMyCity,
  addToCart,
  updateQuantity,
  removeCartItem,
  setMyOrders,
  addMyOrder,
  updateOrderStatus,
  setSearchItems,
  setTotalAmount,
  setSocket,
  setCartItems,
  updateRealtimeOrderStatus,
  setLocationPermission,
  setLocationError,
  addNotification,
  markAllNotificationsRead,
  markNotificationRead,
  clearNotifications
} = userSlice.actions
export default userSlice.reducer
