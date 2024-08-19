const twilio = require('twilio');
const { processRecording } = require('../utils/speechToText');
const { saveRequest } = require('./databaseService');
const { geocodeAddress } = require('./geocodingService');

function handleIncomingCall(req, res) {
  console.log('IVR: Incoming call received', { from: req.body.From, to: req.body.To });
  const twiml = new twilio.twiml.VoiceResponse();
  twiml.gather({
    input: 'dtmf',
    numDigits: '1',
    action: '/ivr/gather-categories',
    method: 'POST'
  }).say('What do you needs? Press 1 for Food, 2 for Medicines, 3 for supplies.');
  res.type('text/xml');
  res.send(twiml.toString());
}

function handleGatherCategories(req, res) {
  console.log('IVR: Processing categories selection', { digits: req.body.Digits });
  const twiml = new twilio.twiml.VoiceResponse();
  const digits = req.body.Digits;
  let categories;
  switch (digits) {
    case '1': categories = 'food'; break;
    case '2': categories = 'meds'; break;
    case '3': categories = 'supplies'; break;
    default:
      console.log('IVR: Invalid categories selection');
      twiml.say('Invalid option. Please try again.');
      twiml.redirect('/ivr/voice');
      res.type('text/xml');
      return res.send(twiml.toString());
  }
  console.log(`IVR: categories selected: ${categories}`);
  twiml.gather({
    input: 'dtmf',
    action: `/ivr/gather-quantity?categories=${categories}`,
    method: 'POST'
  }).say(`You have requested ${categories}. Please enter the quantity using your keypad`);
  res.type('text/xml');
  res.send(twiml.toString());
}

function handleGatherQuantity(req, res) {
  console.log('IVR: Processing quantity input', { categories: req.query.categories, quantity: req.body.Digits });
  const twiml = new twilio.twiml.VoiceResponse();
  const categories = req.query.categories;
  const quantityInput = req.body.Digits;

  // Parse the quantity as an integer, but keep it as a string for further processing
  const quantity = parseInt(quantityInput, 10);

  if (isNaN(quantity) || quantity <= 0 || quantity > 100 || quantityInput.length > 3) {
    console.log('IVR: Invalid quantity input', { quantityInput });
    twiml.say('Invalid quantity. Please enter a number between 1 and 100.');
    twiml.gather({
      input: 'dtmf',
      action: `/ivr/gather-quantity?categories=${categories}`,
      method: 'POST'
    }).say(`You have requested ${categories}. Please enter the quantity using your keypad. The maximum quantity allowed is 100.`);
  } else {
    twiml.say(`You need ${quantityInput} units of ${categories}. Now, please state your address after the beep.`);
    twiml.record({
      action: `/ivr/process-recording?categories=${categories}&quantity=${quantityInput}`,
      method: 'POST',
      maxLength: 60,
      transcribe: false
    });
    console.log('IVR: Initiating address recording');
  }

  res.type('text/xml');
  res.send(twiml.toString());
}

async function handleProcessRecording(req, res) {
  console.log('IVR: Received recording callback', { 
    categories: req.query.categories, 
    quantity: req.query.quantity, 
    recordingSid: req.body.RecordingSid 
  });
  const twiml = new twilio.twiml.VoiceResponse();
  const categories = req.query.categories;
  const quantity = req.query.quantity;
  const recordingSid = req.body.RecordingSid;
  if (!recordingSid) {
    console.error('IVR: No recording SID received');
    twiml.say('We encountered an error processing your request. Please try again.');
    res.type('text/xml');
    return res.send(twiml.toString());
  }
  twiml.say('Thank you. Your request has been recorded and help is on the way.');
  twiml.hangup();
  res.type('text/xml');
  res.send(twiml.toString());
  try {
    await processRecording(recordingSid, categories, quantity);
  } catch (error) {
    console.error('IVR: Error processing recording:', error.message);
  }
}

module.exports = {
  handleIncomingCall,
  handleGatherCategories,
  handleGatherQuantity,
  handleProcessRecording
};