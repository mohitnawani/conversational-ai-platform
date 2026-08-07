import { combineReducers, configureStore } from '@reduxjs/toolkit'
import { useDispatch, useSelector } from 'react-redux'
import authReducer from './authSlice'
import conversationsReducer from './conversationsSlice'
import messagesReducer from './messagesSlice'
import memoryReducer from './memorySlice'

const rootReducer = combineReducers({
  auth: authReducer,
  conversations: conversationsReducer,
  messages: messagesReducer,
  memory: memoryReducer,
})

export const store = configureStore({
  reducer: rootReducer,
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()