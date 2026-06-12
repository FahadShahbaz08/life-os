import {
  Heart, Wallet, Briefcase, Building2, Gamepad2, TrendingUp,
  GraduationCap, Users, Sparkles, Folder,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const AREA_ICON_MAP: Record<string, LucideIcon> = {
  heart: Heart,
  wallet: Wallet,
  briefcase: Briefcase,
  building: Building2,
  gamepad: Gamepad2,
  'trending-up': TrendingUp,
  'graduation-cap': GraduationCap,
  users: Users,
  sparkles: Sparkles,
  folder: Folder,
};

export function getAreaIcon(icon: string): LucideIcon {
  return AREA_ICON_MAP[icon] ?? Folder;
}
