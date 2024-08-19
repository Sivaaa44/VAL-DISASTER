const express = require('express');
const { processSMS } = require('../services/smsService');

const router = express.Router();

router.post('/', processSMS);

module.exports = router;