const express = require('express');
const router = express.Router();
const openlController = require('../controllers/openlController');

// OpenL paths in frontend seem to start with /MFP... so we capture everything
router.all('/*', openlController.proxy);

module.exports = router;
