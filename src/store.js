// src/store.js
import { create } from "zustand";

const useFlightStore = create((set) => ({
  selectedYear: "all",
  userName: null,
  setSelectedYear: (year) => set({ selectedYear: year }),
  setUserName: (name) => set({ userName: name }),
}));

export default useFlightStore;
