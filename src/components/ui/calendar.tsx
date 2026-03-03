"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  dir,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const isRtl = dir === "rtl"

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      dir={dir}
      className={cn("p-3", className)}
      classNames={{
        months: "relative flex flex-col sm:flex-row gap-2",
        month: "flex flex-col gap-3",
        caption: "flex justify-center pt-1 relative items-center w-full",
        caption_label: "text-sm font-bold",
        nav: "flex items-center gap-1",
        button_previous: cn(
          "inline-flex items-center justify-center size-7 rounded-xl bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-all",
          `absolute ${isRtl ? "right-1" : "left-1"}`
        ),
        button_next: cn(
          "inline-flex items-center justify-center size-7 rounded-xl bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-all",
          `absolute ${isRtl ? "left-1" : "right-1"}`
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex mb-1",
        weekday: "text-muted-foreground/60 rounded-md w-9 font-medium text-[0.7rem] text-center uppercase tracking-wide",
        week: "flex w-full mt-1",
        day: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-xl [&:has([aria-selected].day-range-start)]:rounded-l-xl [&:has([aria-selected])]:bg-primary/10 first:[&:has([aria-selected])]:rounded-l-xl last:[&:has([aria-selected])]:rounded-r-xl focus-within:relative focus-within:z-20",
        day_button: cn(
          "h-9 w-9 p-0 font-medium rounded-xl text-sm transition-all hover:bg-muted aria-selected:opacity-100"
        ),
        range_start: "day-range-start",
        range_end: "day-range-end",
        selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-xl shadow-sm",
        today: "bg-primary/10 text-primary font-bold rounded-xl",
        outside: "day-outside text-muted-foreground/30 aria-selected:bg-primary/5 aria-selected:text-muted-foreground aria-selected:opacity-30",
        disabled: "text-muted-foreground/30",
        range_middle:
          "aria-selected:bg-primary/10 aria-selected:text-foreground",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className, ...props }) =>
          orientation === "left" ? (
            <ChevronLeft className={cn("h-3.5 w-3.5", className)} {...props} />
          ) : (
            <ChevronRight className={cn("h-3.5 w-3.5", className)} {...props} />
          ),
      }}
      {...props}
    />
  )
}

export { Calendar }
