const { createDb } = require('./db');
const { createApp } = require('./app');

const PORT = process.env.PORT || 3000;
const db = createDb();
const app = createApp(db);

app.listen(PORT, () => {
  console.log(`clock-orchestrio listening on :${PORT}`);
});
