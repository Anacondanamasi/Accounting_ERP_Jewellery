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
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Requested resource was not found" },
    });
});

const server = app.listen(0, () => {
  const port = server.address().port;
  fetch(`http://localhost:${port}/api/v1/accounts/groups/`, { method: 'PUT' })
    .then(res => res.json())
    .then(data => { console.log("Empty ID:", data); return fetch(`http://localhost:${port}/api/v1/accounts/groups/undefined`, { method: 'PUT' }); })
    .then(res => res.json())
    .then(data => console.log("Undefined ID:", data))
    .catch(console.error)
    .finally(() => server.close());
});
