// Vercel entrypoint: every /api/* request is rewritten here (see vercel.json)
// and handled by the Express app. The app is exported, not listened on.
export { default } from "../server/index.js";
