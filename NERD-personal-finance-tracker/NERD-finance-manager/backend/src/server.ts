// Process entry point: build the app and bind a TCP port.
// Run the built version with `npm start`, or in watch mode with `npm run dev`.

import { createApp } from './app.ts';

const PORT = Number(process.env.PORT) || 3000;

const app = createApp();

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`NERD Finance Manager API listening on http://localhost:${PORT}`);
});
