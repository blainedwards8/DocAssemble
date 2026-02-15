export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["robots.txt"]),
	mimeTypes: {".txt":"text/plain"},
	_: {
		client: {start:"_app/immutable/entry/start.DK8l2vfW.js",app:"_app/immutable/entry/app.DD2mu0iV.js",imports:["_app/immutable/entry/start.DK8l2vfW.js","_app/immutable/chunks/nikc7uf4.js","_app/immutable/chunks/HBH5zySG.js","_app/immutable/chunks/DLOMqRYO.js","_app/immutable/entry/app.DD2mu0iV.js","_app/immutable/chunks/CSkNVMkD.js","_app/immutable/chunks/HBH5zySG.js","_app/immutable/chunks/Dm8n4ajY.js","_app/immutable/chunks/DLOMqRYO.js","_app/immutable/chunks/DjeyT1BH.js","_app/immutable/chunks/Bu_MZV1c.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
