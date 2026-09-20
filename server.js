const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4200;

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: 0,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  }
}));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n  ⚔️  KISLAY CHOUBEY — Anime Portfolio`);
  console.log(`  🌐 Running at http://localhost:${PORT}\n`);
});
