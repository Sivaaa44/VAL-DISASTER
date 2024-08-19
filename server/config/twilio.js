const twilio = require('twilio');

const twilioSmsClient = twilio(
  process.env.TWILIO_SMS2_ACCOUNT_SID,
  process.env.TWILIO_SMS2_AUTH_TOKEN
);

const twilioIvrClient = twilio(
  process.env.TWILIO_IVR_ACCOUNT_SID,
  process.env.TWILIO_IVR_AUTH_TOKEN
);

const smsPhoneNumber = process.env.TWILIO_SMS2_PHONE_NUMBER;
const ivrPhoneNumber = process.env.TWILIO_IVR_PHONE_NUMBER;

module.exports = {
  twilioSmsClient,
  twilioIvrClient,
  smsPhoneNumber,
  ivrPhoneNumber,
};