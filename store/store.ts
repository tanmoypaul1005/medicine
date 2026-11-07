import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { medicineApi } from "./medicineApi";

// Combine at module load: combineReducers' shape check calls Math.random(),
// which Next.js (cacheComponents) forbids during render.
const rootReducer = combineReducers({
  [medicineApi.reducerPath]: medicineApi.reducer,
});

export const makeStore = () =>
  configureStore({
    reducer: rootReducer,
    middleware: (getDefault) => getDefault().concat(medicineApi.middleware),
  });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = AppStore["dispatch"];
