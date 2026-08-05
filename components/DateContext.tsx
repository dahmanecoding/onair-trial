"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { startOfToday, subDays, addDays } from "date-fns";

type DateContextType = {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  goBack: () => void;
  goForward: () => void;
  isToday: boolean;
};

const DateContext = createContext<DateContextType | undefined>(undefined);

export function DateProvider({ children }: { children: ReactNode }) {
  const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());

  const goBack = () => setSelectedDate((prev) => subDays(prev, 1));
  const goForward = () => setSelectedDate((prev) => addDays(prev, 1));
  
  const isToday = selectedDate.getTime() === startOfToday().getTime();

  return (
    <DateContext.Provider value={{ selectedDate, setSelectedDate, goBack, goForward, isToday }}>
      {children}
    </DateContext.Provider>
  );
}

export function useDate() {
  const context = useContext(DateContext);
  if (context === undefined) {
    throw new Error("useDate must be used within a DateProvider");
  }
  return context;
}
