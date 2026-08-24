/*
 * PM2 process config for the Moximos API.
 *
 * .cjs, not .js: package.json declares "type": "module", so a .js file here
 * would be parsed as ESM and PM2 expects CommonJS.
 */
module.exports = {
    apps: [
        {
            name: "moximos-api",
            script: "server/index.js",
            cwd: "/var/www/moximos",
            instances: 1,
            // Deliberately NOT cluster mode. Sessions, the daily Places cap
            // and the whole database live in one JSON file on disk; two
            // workers would race each other's writes and lose data.
            exec_mode: "fork",
            env: { NODE_ENV: "production", PORT: 8787 },
            max_memory_restart: "600M",
            error_file: "/var/log/moximos/error.log",
            out_file: "/var/log/moximos/out.log",
            time: true,
            // A generation in flight should not be killed instantly on
            // restart; give the current request room to finish.
            kill_timeout: 15000,
        },
    ],
};
