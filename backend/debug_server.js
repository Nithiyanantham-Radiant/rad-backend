const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002; // Use distinct port

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Try requiring superset route
try {
    const supersetRoutes = require('./routes/superset');
    app.use('/api/superset', supersetRoutes);
    console.log('Superset routes loaded');
} catch (e) {
    console.error('Superset routes failed:', e);
}

app.listen(PORT, () => {
  console.log(`Debug Server running on port ${PORT}`);
});
