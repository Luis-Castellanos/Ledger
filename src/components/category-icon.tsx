import { createElement } from "react";
import {
  ArrowLeftRight,
  Banknote,
  Briefcase,
  Car,
  Coffee,
  CreditCard,
  Dumbbell,
  Film,
  Fuel,
  Gift,
  GraduationCap,
  HeartPulse,
  Home,
  PawPrint,
  Percent,
  Plane,
  Plug,
  Plus,
  Repeat,
  Shield,
  ShoppingBag,
  ShoppingBasket,
  Smartphone,
  Sparkles,
  Tag,
  TrainFront,
  Utensils,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* icon names stored on category rows (seeded from default-categories) */
const ICONS_BY_NAME: Record<string, LucideIcon> = {
  banknote: Banknote,
  briefcase: Briefcase,
  percent: Percent,
  plus: Plus,
  home: Home,
  plug: Plug,
  wrench: Wrench,
  utensils: Utensils,
  "shopping-basket": ShoppingBasket,
  coffee: Coffee,
  car: Car,
  fuel: Fuel,
  shield: Shield,
  train: TrainFront,
  sparkles: Sparkles,
  "shopping-bag": ShoppingBag,
  repeat: Repeat,
  plane: Plane,
  "arrow-left-right": ArrowLeftRight,
  "credit-card": CreditCard,
};

/* heuristics for user-created categories that have no stored icon */
const KEYWORD_ICONS: [RegExp, LucideIcon][] = [
  [/gym|fitness|sport/i, Dumbbell],
  [/health|medical|doctor|pharma/i, HeartPulse],
  [/pet|dog|cat|vet/i, PawPrint],
  [/gift|donation|charity/i, Gift],
  [/movie|entertainment|game|stream/i, Film],
  [/phone|mobile|internet/i, Smartphone],
  [/school|tuition|education|course/i, GraduationCap],
  [/coffee|cafe/i, Coffee],
  [/grocer/i, ShoppingBasket],
  [/restaurant|dining|food/i, Utensils],
  [/travel|flight|vacation/i, Plane],
  [/rent|mortgage|home|housing/i, Home],
  [/car|auto|vehicle/i, Car],
  [/transfer|payment/i, ArrowLeftRight],
  [/income|salary|payroll|pay/i, Banknote],
  [/subscription/i, Repeat],
  [/shop/i, ShoppingBag],
];

export function resolveCategoryIcon(icon: string | null | undefined, name: string | null | undefined): LucideIcon {
  if (icon && ICONS_BY_NAME[icon]) {
    return ICONS_BY_NAME[icon];
  }
  if (name) {
    for (const [pattern, Icon] of KEYWORD_ICONS) {
      if (pattern.test(name)) {
        return Icon;
      }
    }
  }
  return Tag;
}

export function CategoryIcon({
  icon,
  name,
  color,
  size = "md",
  className,
}: {
  icon?: string | null;
  name?: string | null;
  color?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const tint = color || "var(--muted-foreground)";
  const dimensions = size === "sm" ? "size-5 [&>svg]:size-3" : size === "lg" ? "size-9 [&>svg]:size-4.5" : "size-7 [&>svg]:size-3.5";

  return (
    <span
      aria-hidden
      className={cn("flex shrink-0 items-center justify-center rounded-full", dimensions, className)}
      style={{ background: `color-mix(in oklab, ${tint} 16%, transparent)`, color: tint }}
    >
      {createElement(resolveCategoryIcon(icon, name), { strokeWidth: 2 })}
    </span>
  );
}
