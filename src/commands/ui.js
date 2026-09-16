import { createServer } from "../server.js";
import { registerShutdownHandler } from "../lib/shutdown.js";

export async function uiCommand(options = {}) {
  const port = options.port || 4545;
  const app = createServer();
  const server = app.listen(port, () => {
    console.log(`Dashboard running at http://localhost:${port}`);
    console.log("(If you see 'Dashboard not built yet', run: cd web && npm install && npm run build)");
  });

  registerShutdownHandler(
    (signal) =>
      new Promise((resolve) => {
        console.log(`\nReceived ${signal}, shutting down dashboard...`);
        // Force-exit if close() hangs (e.g. a client left a connection open).
        const forceExit = setTimeout(resolve, 2000);
        forceExit.unref();
        server.close(() => {
          clearTimeout(forceExit);
          resolve();
        });
      }),
  );
}
