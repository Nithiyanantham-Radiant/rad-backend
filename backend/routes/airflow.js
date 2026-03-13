const express = require('express');
const router = express.Router();
const airflowController = require('../controllers/airflowController');

router.post('/trigger', airflowController.triggerDag);
router.get('/status/:dag_id/:dag_run_id', airflowController.checkStatus);

module.exports = router;
