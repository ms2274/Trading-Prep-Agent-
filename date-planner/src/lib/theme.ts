import { StopCategory, TransportMode, Vibe } from "./types";

export const CATEGORY_EMOJI: Record<StopCategory, string> = {
  coffee: "☕",
  lunch: "🥗",
  dinner: "🍽️",
  drinks: "🍸",
  activity: "🎯",
  dessert: "🍰",
};

// Warm tints per stop category — used as a gentle background gradient on the
// photo-carousel placeholder, and as a category label chip color. All chosen
// to sit against the dark surface without competing with the accent.
export const CATEGORY_TINT: Record<StopCategory, { from: string; to: string; chip: string }> = {
  coffee: { from: "#3d2617", to: "#1d1109", chip: "rgba(217, 148, 84, 0.15)" },
  lunch: { from: "#2b3a1c", to: "#141b0d", chip: "rgba(163, 190, 100, 0.15)" },
  dinner: { from: "#3a1a1a", to: "#1a0b0b", chip: "rgba(244, 63, 94, 0.18)" },
  drinks: { from: "#2a1a3d", to: "#130a1c", chip: "rgba(180, 130, 240, 0.18)" },
  activity: { from: "#1d2f3a", to: "#0d1620", chip: "rgba(96, 165, 250, 0.18)" },
  dessert: { from: "#3d2233", to: "#1c0f18", chip: "rgba(244, 114, 182, 0.18)" },
};

export const VIBE_ACCENT: Record<Vibe, string> = {
  romantic: "#f43f5e",
  casual: "#f7a13c",
  adventurous: "#fb923c",
  foodie: "#f5c249",
  artsy: "#c084fc",
  chill: "#5eead4",
};

export const TRANSPORT_EMOJI: Record<TransportMode, string> = {
  walking: "🚶",
  transit: "🚇",
  driving: "🚗",
};
