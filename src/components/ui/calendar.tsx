"use client"

import * as React from "react"
import { DayPicker, DropdownNav, useDayPicker, type MonthCaptionProps, type NavProps } from "react-day-picker"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

/** Custom Nav: renders nothing — navigation is handled inside MonthCaption */
function CalendarNav(_props: NavProps): React.JSX.Element {
  return <></>
}

/** Custom MonthCaption: [prev] [dropdowns] [next] in one row */
function CalendarMonthCaption({ calendarMonth, displayIndex, className, ...props }: MonthCaptionProps): React.JSX.Element {
  const { nextMonth, previousMonth, goToMonth } = useDayPicker()

  return (
    <div
      {...props}
      className={cn("flex items-center justify-between px-1 py-1", className)}
    >
      <button
        type="button"
        aria-label="Previous month"
        disabled={!previousMonth}
        onClick={() => previousMonth && goToMonth(previousMonth)}
        className={cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          "h-7 w-7 bg-transparent opacity-60 hover:opacity-100 hover:bg-accent disabled:opacity-20 shrink-0"
        )}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <DropdownNav className="flex items-center gap-1.5" />

      <button
        type="button"
        aria-label="Next month"
        disabled={!nextMonth}
        onClick={() => nextMonth && goToMonth(nextMonth)}
        className={cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          "h-7 w-7 bg-transparent opacity-60 hover:opacity-100 hover:bg-accent disabled:opacity-20 shrink-0"
        )}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        root: "w-full",
        months: "flex flex-col sm:flex-row gap-4",
        month: "flex flex-col gap-3",
        month_caption: "flex items-center justify-between px-1 py-1",
        caption_label: "text-sm font-semibold",
        dropdowns: "flex items-center gap-1.5",
        dropdown_root: "relative",
        dropdown:
          "appearance-none bg-background border border-border rounded-md px-2 py-1 text-sm font-medium cursor-pointer hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring/50 transition-colors",
        nav: "hidden",
        button_previous: "hidden",
        button_next: "hidden",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday:
          "text-muted-foreground w-9 h-8 flex items-center justify-center text-[0.75rem] font-medium",
        weeks: "flex flex-col gap-1 mt-1",
        week: "flex",
        day: "relative w-9 h-9 flex items-center justify-center p-0 text-sm [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal rounded-md aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground"
        ),
        selected:
          "rounded-md bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        today: "rounded-md bg-accent text-accent-foreground font-semibold",
        outside:
          "text-muted-foreground opacity-40 aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
        disabled: "text-muted-foreground opacity-30 cursor-not-allowed",
        range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground rounded-none",
        range_start: "rounded-l-md",
        range_end: "rounded-r-md",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Nav: CalendarNav,
        MonthCaption: CalendarMonthCaption,
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          ),
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
