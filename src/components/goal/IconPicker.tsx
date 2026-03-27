'use client';

import React from 'react';
import {
    Target,
    Zap,
    Book,
    Briefcase,
    Dumbbell,
    GraduationCap,
    Heart,
    Home,
    Globe,
    Music,
    Palette,
    Plane,
    Code,
    Coffee,
    Gamepad,
    Gamepad2,
    Lightbulb,
    Smile,
    Star,
    Sun,
    Trophy,
    User,
    Video,
    Wallet,
    Watch,
    Rocket,
    Camera,
    Headphones,
    ShoppingBag,
    Bike,
    Car,
    Train,
    Pizza,
    Utensils,
    Apple,
    Leaf,
    Mountain,
    Waves,
    Cloud,
    CloudLightning,
    CloudRain,
    CloudSnow,
    Moon,
    Sparkles,
    Flame,
    Droplet,
    Wind,
    Snowflake,
    Flower2,
    Trees,
    Building,
    Building2,
    Store,
    Hospital,
    School,
    Church,
    Factory,
    Landmark,
    Castle,
    Tent,
    Bed,
    Bath,
    Sofa,
    Lamp,
    Shirt,
    ShoppingCart,
    Gift,
    Package,
    Truck,
    Bus,
    Ship,
    Anchor,
    MapPin,
    Map,
    Compass,
    Navigation,
    Flag,
    Award,
    Medal,
    Crown,
    Shield,
    Sword,
    Wand2,
    Gem,
    Diamond,
    DollarSign,
    Euro,
    PoundSterling,
    CreditCard,
    Banknote,
    PiggyBank,
    TrendingUp,
    TrendingDown,
    BarChart3,
    PieChart,
    Activity,
    Gauge,
    Timer,
    Clock,
    Calendar,
    CalendarDays,
    AlarmClock,
    Hourglass,
    Umbrella,
    Key,
    Bell,
    Bookmark,
    Clipboard,
    Crosshair,
    Feather
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export const ICONS = {
    Target,
    Zap,
    Book,
    Briefcase,
    Dumbbell,
    GraduationCap,
    Heart,
    Home,
    Globe,
    Music,
    Palette,
    Plane,
    Code,
    Coffee,
    Gamepad,
    Gamepad2,
    Lightbulb,
    Smile,
    Star,
    Sun,
    Trophy,
    User,
    Video,
    Wallet,
    Watch,
    Rocket,
    Camera,
    Headphones,
    ShoppingBag,
    Bike,
    Car,
    Train,
    Pizza,
    Utensils,
    Apple,
    Leaf,
    Mountain,
    Waves,
    Cloud,
    CloudLightning,
    CloudRain,
    CloudSnow,
    Moon,
    Sparkles,
    Flame,
    Droplet,
    Wind,
    Snowflake,
    Flower2,
    Trees,
    Building,
    Building2,
    Store,
    Hospital,
    School,
    Church,
    Factory,
    Landmark,
    Castle,
    Tent,
    Bed,
    Bath,
    Sofa,
    Lamp,
    Shirt,
    ShoppingCart,
    Gift,
    Package,
    Truck,
    Bus,
    Ship,
    Anchor,
    MapPin,
    Map,
    Compass,
    Navigation,
    Flag,
    Award,
    Medal,
    Crown,
    Shield,
    Sword,
    Wand2,
    Gem,
    Diamond,
    DollarSign,
    Euro,
    PoundSterling,
    CreditCard,
    Banknote,
    PiggyBank,
    TrendingUp,
    TrendingDown,
    BarChart3,
    PieChart,
    Activity,
    Gauge,
    Timer,
    Clock,
    Calendar,
    CalendarDays,
    AlarmClock,
    Hourglass,
    Umbrella,
    Key,
    Bell,
    Bookmark,
    Clipboard,
    Crosshair,
    Feather
};

export type IconName = keyof typeof ICONS;

interface IconPickerProps {
    selectedIcon: string;
    onSelectIcon: (icon: string) => void;
    className?: string;
}

export function IconPicker({ selectedIcon, onSelectIcon, className }: IconPickerProps) {
    const SelectedIconComponent = ICONS[selectedIcon as IconName] || Target;

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn("w-12 h-12 p-0 rounded-xl", className)}
                >
                    <SelectedIconComponent className="w-6 h-6" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[calc(100vw-2rem)] sm:w-96 p-3 sm:p-4 max-h-72 sm:max-h-96 overflow-y-auto" align="center" side="bottom" sideOffset={8}>
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 sm:gap-2">
                    {Object.entries(ICONS).map(([name, Icon]) => (
                        <Button
                            key={name}
                            variant="ghost"
                            className={cn(
                                "w-9 h-9 sm:w-10 sm:h-10 p-0 rounded-lg hover:bg-muted",
                                selectedIcon === name && "bg-primary/20 text-primary hover:bg-primary/30"
                            )}
                            onClick={() => onSelectIcon(name)}
                        >
                            <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                        </Button>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}

export function getIconComponent(iconName: string) {
    return ICONS[iconName as IconName] || Target;
}

export function getGoalIcon(iconName: string | undefined | null) {
    const IconComponent = (iconName && ICONS[iconName as IconName]) || Target;
    return <IconComponent className="w-full h-full" />;
}

interface GoalIconPickerProps {
    currentIconName: string;
    onSelect: (iconName: string) => void;
    children: React.ReactNode;
}

export function GoalIconPicker({ currentIconName, onSelect, children }: GoalIconPickerProps) {
    const [open, setOpen] = React.useState(false);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                {children}
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-3" align="start">
                <div className="grid grid-cols-6 gap-2 max-h-[300px] overflow-y-auto pr-1">
                    {Object.entries(ICONS).map(([name, Icon]) => (
                        <button
                            key={name}
                            onClick={() => {
                                onSelect(name);
                                setOpen(false);
                            }}
                            className={cn(
                                "h-10 w-10 p-2 rounded-xl flex items-center justify-center transition-all",
                                currentIconName === name 
                                    ? 'bg-primary/20 text-primary scale-110 shadow-sm' 
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95'
                            )}
                        >
                            <Icon className="w-5 h-5" />
                        </button>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}
