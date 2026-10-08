import { createApp } from "../src/app.js";

const server = createApp().listen(0, async () => {
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("pas de port");
  const res = await fetch(`http://localhost:${address.port}/api/health`);
  console.log(`STATUS ${res.status}`);
  console.log(await res.text());
  server.close();
});
