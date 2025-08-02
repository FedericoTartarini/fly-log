// src/store.js
import { create } from "zustand";

const useFlightStore = create((set) => ({
  selectedYear: "all",
  setSelectedYear: (year) => set({ selectedYear: year }),
}));

export default useFlightStore;
