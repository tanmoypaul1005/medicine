import { configureStore } from "@reduxjs/toolkit";
import { medicineApi } from "./medicineApi";

export const makeStore = () =>
  configureStore({
    reducer: { [medicineApi.reducerPath]: medicineApi.reducer },
    middleware: (getDefault) => getDefault().concat(medicineApi.middleware),
  });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
