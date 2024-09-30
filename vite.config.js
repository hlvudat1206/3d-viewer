import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import path from "path";
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte()],
  base: "/3d-viewer/",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@js": path.resolve(__dirname, "./js"),
      "@public": path.resolve(__dirname, "./public"),
      "@build": path.resolve(__dirname, "./build"),
    },
  },
});
