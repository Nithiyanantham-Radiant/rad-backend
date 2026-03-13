const express = require('express');
const router = express.Router();
const supersetController = require('../controllers/supersetController');

router.post('/guest_token', supersetController.guestToken);

// Generic Proxy Routes for standard API calls
// CAUTION: The order matters. Specific routes before wildcards if any.

// Proxy GET requests (e.g., /chart/, /dataset/)
// Usage: /api/superset/v1/chart/123 -> calls Superset /api/v1/chart/123
router.get('/v1/*', supersetController.proxyGet);

// Proxy POST requests
router.post('/v1/*', supersetController.proxyPost);

// Proxy PUT requests
router.put('/v1/*', supersetController.proxyPut);

module.exports = router;
