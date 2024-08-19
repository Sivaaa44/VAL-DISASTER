const express = require('express');
const { handleIncomingCall,handleGatherQuantity, handleProcessRecording, handleGatherCategories } = require('../services/ivrService');

const router = express.Router();

router.post('/voice', handleIncomingCall);
router.post('/gather-categories', handleGatherCategories);
router.post('/gather-quantity', handleGatherQuantity);
router.post('/process-recording', handleProcessRecording);

module.exports = router;