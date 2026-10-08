const express = require('express');
const { Router } = require('express');

const accountRoutes = Router();

accountRoutes.put("/groups/:id", (req, res) => {
  res.json({ success: true, message: "Matched PUT /groups/:id" });
});

accountRoutes.get("/:id", (req, res) => {
  res.json({ success: true, message: "Matched GET /:id" });
});

accountRoutes.put("/:id", (req, res) => {
  res.json({ success: true, message: "Matched PUT /:id" });
});

const app = express();
app.use("/api/v1/accounts", accountRoutes);

const server = app.listen(0, () => {
  const port = server.address().port;
  fetch(`http://localhost:${port}/api/v1/accounts/groups/24`, { method: 'PUT' })
    .then(res => res.json())
    .then(console.log)
    .catch(console.error)
    .finally(() => server.close());
});
