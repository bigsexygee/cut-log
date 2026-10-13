export default function manifest() {
  return {
    name: "Cut Log", short_name: "Cut Log",
    description: "Meals, workouts, steps and weigh-ins for the cut to 12% body fat.",
    start_url: "/", display: "standalone", background_color: "#ECEFF2", theme_color: "#2B55C0",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
