"use client";

import { AVATAR_GRADIENTS, type AvatarKind } from "@/lib/profile/avatars";

export function Avatar({
  className = "",
  gradient = "institutional",
  image,
  kind = "gradient",
  name,
  size = 34,
}: {
  className?: string;
  gradient?: string;
  image?: string | null;
  kind?: AvatarKind;
  name: string;
  size?: number;
}) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "PL";

  if (kind === "image" && image) {
    return <div aria-hidden="true" className={`shrink-0 rounded-full bg-cover bg-center ${className}`} style={{ width: size, height: size, backgroundImage: `url(${image})` }} />;
  }

  const background = kind === "solid" ? "#5f9f3c" : AVATAR_GRADIENTS[gradient as keyof typeof AVATAR_GRADIENTS] ?? AVATAR_GRADIENTS.institutional;

  return (
    <div
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-white ${className}`}
      style={{ width: size, height: size, background }}
    >
      {initials}
    </div>
  );
}
