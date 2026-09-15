import { createServer } from "../server.js";

export async function uiCommand(options = {}) {
  const port = options.port || 4545;
  const app = createServer();
  app.listen(port, () => {
    console.log(`Dashboard running at http://localhost:${port}`);
    console.log("(If you see 'Dashboard not built yet', run: cd web && npm install && npm run build)");
  });
}
