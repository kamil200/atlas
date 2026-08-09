import { configureStore } from "@reduxjs/toolkit";
import { baseApi } from "./api/base-api";

/*
  Redux holds the RTK Query cache and nothing else. Filters and the open
  sidebar live in the URL; music and recent searches live in localStorage.
  That one sentence is the whole state story.
*/
export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (getDefault) => getDefault().concat(baseApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
