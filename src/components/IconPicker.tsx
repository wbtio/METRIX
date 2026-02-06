'use client';

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
    Hourglass
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
    Hourglass
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
            <PopoverContent className="w-96 p-4 max-h-96 overflow-y-auto" align="start">
                <div className="grid grid-cols-8 gap-2">
                    {Object.entries(ICONS).map(([name, Icon]) => (
                        <Button
                            key={name}
                            variant="ghost"
                            className={cn(
                                "w-10 h-10 p-0 rounded-lg hover:bg-muted",
                                selectedIcon === name && "bg-primary/20 text-primary hover:bg-primary/30"
                            )}
                            onClick={() => onSelectIcon(name)}
                        >
                            <Icon className="w-5 h-5" />
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
