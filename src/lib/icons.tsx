import {
  Fingerprint,
  HeartPulse,
  Receipt,
  Shield,
  Landmark,
  Banknote,
  Scale,
  House,
  Car,
  GraduationCap,
  Briefcase,
  PawPrint,
  FileText,
  Home,
  Utensils,
  ShoppingBag,
  Tv,
  Zap,
  Scissors,
  Wallet,
  TrendingUp,
  ArrowLeftRight,
  Baby,
  Plane,
  Gift,
  Repeat,
  Tag,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Transaction category icons
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  home: Home,
  utensils: Utensils,
  car: Car,
  "shopping-bag": ShoppingBag,
  tv: Tv,
  "heart-pulse": HeartPulse,
  zap: Zap,
  shield: Shield,
  "graduation-cap": GraduationCap,
  scissors: Scissors,
  wallet: Wallet,
  "trending-up": TrendingUp,
  "arrow-left-right": ArrowLeftRight,
  baby: Baby,
  "paw-print": PawPrint,
  plane: Plane,
  gift: Gift,
  receipt: Receipt,
  repeat: Repeat,
  banknote: Banknote,
};

export function CategoryIcon({
  iconName,
  className,
  style,
}: {
  iconName: string | null;
  className?: string;
  style?: React.CSSProperties;
}) {
  const Icon = iconName ? (CATEGORY_ICONS[iconName] ?? Tag) : Tag;
  return <Icon className={className} style={style} />;
}

// Document category icons
export const DOCUMENT_CATEGORY_ICONS: Record<string, LucideIcon> = {
  fingerprint: Fingerprint,
  "heart-pulse": HeartPulse,
  receipt: Receipt,
  shield: Shield,
  landmark: Landmark,
  banknote: Banknote,
  scale: Scale,
  house: House,
  car: Car,
  "graduation-cap": GraduationCap,
  briefcase: Briefcase,
  "paw-print": PawPrint,
};

export function getDocumentCategoryIcon(iconName: string | null): LucideIcon {
  if (!iconName) return FileText;
  return DOCUMENT_CATEGORY_ICONS[iconName] ?? FileText;
}

/**
 * Renders a document category icon based on icon name.
 * Use this component instead of getDocumentCategoryIcon to avoid
 * React compiler warnings about creating components during render.
 */
export function DocumentCategoryIcon({
  iconName,
  className,
  style,
}: {
  iconName: string | null;
  className?: string;
  style?: React.CSSProperties;
}) {
  const Icon = iconName ? (DOCUMENT_CATEGORY_ICONS[iconName] ?? FileText) : FileText;
  return <Icon className={className} style={style} />;
}
