const express = require('express');
const router = express.Router();
const keystoneController = require('../controllers/keystoneController');

router.post('/', keystoneController.proxyGraphQL);

module.exports = router;
