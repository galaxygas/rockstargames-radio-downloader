import { createServerFn } from "@tanstack/react-start";

export const loadCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const { getCatalog } = await import("./catalog.server");
  return getCatalog(false);
});

export const refreshCatalog = createServerFn({ method: "POST" }).handler(async () => {
  const { getCatalog } = await import("./catalog.server");
  return getCatalog(true);
});
