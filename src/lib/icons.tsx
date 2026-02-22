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
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

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
