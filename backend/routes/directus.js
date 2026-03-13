const express = require('express');
const router = express.Router();
const directusController = require('../controllers/directusController');

router.all('/*', directusController.proxy);

module.exports = router;
