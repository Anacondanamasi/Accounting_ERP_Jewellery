const express = require('express');
const { Router } = require('express');

const accountRoutes = Router();

accountRoutes.post("/groups", (req, res) => {
  res.json({ success: true, message: "Matched POST /groups" });
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
  fetch(`http://localhost:${port}/api/v1/accounts/groups`, { method: 'POST' })
    .then(res => res.json())
    .then(data => console.log("POST groups:", data))
    .catch(console.error)
    .finally(() => server.close());
});
