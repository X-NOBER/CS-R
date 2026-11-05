import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 5173,
    fs: {
      allow: [
        "..",
        "C:/Users/nylib/Downloads/CS16_v_weapons_unified_arms",
        "C:/Users/nylib/Downloads/cstrike-reanims-rebornv14_ec171",
      ],
    },
  },
});
