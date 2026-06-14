export type AvatarKind = "gradient" | "solid" | "image";

export const DEFAULT_AVATAR_GRADIENT = "institutional";

export const AVATAR_GRADIENTS = {
  institutional: "linear-gradient(135deg, #5f9f3c, #274a2a)",
  graphite: "linear-gradient(135deg, #6b665d, #1b2020)",
  blue: "linear-gradient(135deg, #9bc9ff, #315a7d)",
  violet: "linear-gradient(135deg, #a78bfa, #4c357a)",
} as const;

export type NavSection = {
  id: string;
  label: string;
  items: string[];
};

export type ProfileData = {
  name: string;
  email: string;
  avatarKind: AvatarKind;
  avatarGradient: string;
  avatarImage: string | null;
  navHidden: string[];
  navLayout: NavSection[];
};
