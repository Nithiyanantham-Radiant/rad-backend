const express = require('express');
const router = express.Router();
const appApiController = require('../controllers/appApiController');

router.all('/*', appApiController.proxy);

module.exports = router;
