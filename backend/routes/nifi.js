const express = require('express');
const router = express.Router();
const nifiController = require('../controllers/nifiController');

router.all('/*', nifiController.proxy);

module.exports = router;
