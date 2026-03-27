"use client"

import * as React from "react"
import { DayPicker, useDayPicker, type MonthCaptionProps } from "react-day-picker"
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

/** Custom Nav: renders nothing — navigation is handled inside MonthCaption */
function CalendarNav(): React.JSX.Element {
  return <></>
}

function CalendarChevron({
  orientation,
  className,
  size,
}: {
  orientation?: "up" | "down" | "left" | "right"
  className?: string
  size?: number
}): React.JSX.Element {
  if (orientation === "left") {
    return <ChevronLeft className={className} size={size} />
  }

  if (orientation === "right") {
    return <ChevronRight className={className} size={size} />
  }

  return (
    <ChevronDown
      className={cn("shrink-0 opacity-70", orientation === "up" && "rotate-180", className)}
      size={size}
    />
  )
}

/** Custom MonthCaption: [prev] [dropdowns] [next] in one row */
function CalendarMonthCaption({
  calendarMonth,
  displayIndex,
  className,
  children,
  ...props
}: MonthCaptionProps): React.JSX.Element {
  const { nextMonth, previousMonth, goToMonth, dayPickerProps, labels } = useDayPicker()
  const isRtl = dayPickerProps.dir === "rtl"
  void calendarMonth
  void displayIndex

  return (
    <div
      {...props}
      className={cn(
        "flex w-full items-center gap-2 rounded-2xl border border-border/50 bg-muted/20 p-1 shadow-xs backdrop-blur-[2px]",
        className
      )}
    >
      <button
        type="button"
        aria-label={labels.labelPrevious(previousMonth)}
        disabled={!previousMonth}
        onClick={() => previousMonth && goToMonth(previousMonth)}
        className={cn(
          buttonVariants({ variant: "outline", size: "icon-sm" }),
          "h-8 w-8 shrink-0 rounded-xl border-border/60 bg-background/90 shadow-xs opacity-90 hover:bg-accent hover:text-accent-foreground hover:opacity-100 disabled:opacity-40"
        )}
      >
        {isRtl ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>

      <div className="flex min-w-0 flex-1 items-center justify-center">
        {children}
      </div>

      <button
        type="button"
        aria-label={labels.labelNext(nextMonth)}
        disabled={!nextMonth}
        onClick={() => nextMonth && goToMonth(nextMonth)}
        className={cn(
          buttonVariants({ variant: "outline", size: "icon-sm" }),
          "h-8 w-8 shrink-0 rounded-xl border-border/60 bg-background/90 shadow-xs opacity-90 hover:bg-accent hover:text-accent-foreground hover:opacity-100 disabled:opacity-40"
        )}
      >
        {isRtl ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
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
        root: "w-fit",
        months: "flex w-fit flex-col sm:flex-row gap-4",
        month: "flex w-[17rem] max-w-full flex-col gap-3",
        month_caption: "w-full",
        caption_label:
          "pointer-events-none inline-flex h-full w-full items-center justify-between gap-2 whitespace-nowrap px-3 text-sm font-semibold tracking-tight text-foreground",
        dropdowns:
          "flex w-full max-w-[12rem] min-w-0 items-center justify-center gap-1.5 rounded-xl bg-background/80 px-1 py-1 shadow-xs ring-1 ring-border/40 backdrop-blur-sm",
        dropdown_root:
          "relative inline-flex h-8 min-w-[4.75rem] items-center rounded-lg border border-border/60 bg-background transition-[background,border-color,box-shadow] hover:bg-accent/60 hover:border-ring/40 focus-within:border-ring/50 focus-within:ring-2 focus-within:ring-ring/20 [&:has(.rdp-months_dropdown)]:min-w-[6.5rem] [&:has(.rdp-years_dropdown)]:min-w-[5rem]",
        dropdown:
          "absolute inset-0 z-10 m-0 size-full cursor-pointer appearance-none border-0 bg-transparent opacity-0 focus:outline-none",
        nav: "hidden",
        button_previous: "hidden",
        button_next: "hidden",
        month_grid: "w-full table-fixed border-collapse",
        weekdays: "flex w-full",
        weekday:
          "text-muted-foreground flex-1 basis-0 h-8 min-w-0 flex items-center justify-center text-[0.75rem] font-medium",
        weeks: "mt-1 flex w-full flex-col gap-1",
        week: "flex w-full",
        day: "relative flex h-9 flex-1 basis-0 items-center justify-center p-0 text-sm [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
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
        Chevron: CalendarChevron,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
