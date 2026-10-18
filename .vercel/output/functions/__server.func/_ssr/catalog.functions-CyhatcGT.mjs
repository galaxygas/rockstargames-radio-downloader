import { n as TSS_SERVER_FUNCTION, t as createServerFn } from "./ssr.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/catalog.functions-CyhatcGT.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var loadCatalog_createServerFn_handler = createServerRpc({
	id: "40bb62fced5602a8ed1dcd14c043b6c4128508a90927fe3ace9ce104feac2841",
	name: "loadCatalog",
	filename: "src/lib/radio/catalog.functions.ts"
}, (opts) => loadCatalog.__executeServer(opts));
var loadCatalog = createServerFn({ method: "GET" }).handler(loadCatalog_createServerFn_handler, async () => {
	const { getCatalog } = await import("./catalog.server-CAQ7FHhG.mjs").then((n) => n.r);
	return getCatalog(false);
});
var refreshCatalog_createServerFn_handler = createServerRpc({
	id: "398e5d2a3035c1da16d3a082235b41b09b16a4ce375ff5d9e62675aeb2d17b8c",
	name: "refreshCatalog",
	filename: "src/lib/radio/catalog.functions.ts"
}, (opts) => refreshCatalog.__executeServer(opts));
var refreshCatalog = createServerFn({ method: "POST" }).handler(refreshCatalog_createServerFn_handler, async () => {
	const { getCatalog } = await import("./catalog.server-CAQ7FHhG.mjs").then((n) => n.r);
	return getCatalog(true);
});
//#endregion
export { loadCatalog_createServerFn_handler, refreshCatalog_createServerFn_handler };
