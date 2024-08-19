const { geocodeAddress } = require('./geocodingService');
const { saveRequest, saveToFirestore } = require('./databaseService');
const { twilioSmsClient, smsPhoneNumber } = require('../config/twilio');

const ACCEPTED_NEEDS = ['food', 'medicines', 'supplies'];

// function parseIndianAddress(address) {
//     address = address.trim().toLowerCase();
  
//     const components = {
//         pincode: address.match(/\b\d{6}\b/),
//         state: address.match(/\b(andhra pradesh|arunachal pradesh|assam|bihar|chhattisgarh|goa|gujarat|haryana|himachal pradesh|jharkhand|karnataka|kerala|madhya pradesh|maharashtra|manipur|meghalaya|mizoram|nagaland|odisha|punjab|rajasthan|sikkim|tamil nadu|telangana|tripura|uttar pradesh|uttarakhand|west bengal|andaman and nicobar islands|chandigarh|dadra and nagar haveli and daman and diu|delhi|jammu and kashmir|ladakh|lakshadweep|puducherry)\b/),
//         city: address.match(/\b(mumbai|delhi|bangalore|hyderabad|ahmedabad|chennai|kolkata|surat|pune|jaipur|lucknow|kanpur|nagpur|indore|thane|bhopal|visakhapatnam|pimpri-chinchwad|patna|vadodara|ghaziabad|ludhiana|agra|nashik|faridabad|meerut|rajkot|kalyan-dombivli|vasai-virar|varanasi)\b/)
//     };
  
//     for (let key in components) {
//         if (components[key]) {
//             components[key] = components[key][0];
//             address = address.replace(components[key], '');
//         } else {
//             components[key] = null;
//         }
//     }
  
//     components.street = address.replace(/,/g, '').trim();
  
//     return components;
// }

// async function parseMessage(body) {
//     body = body.trim();
//     const needIndex = body.toLowerCase().indexOf('need');
  
//     let location, message, quantity;
  
//     if (needIndex !== -1) {
//         location = body.slice(0, needIndex).trim();
//         const needPart = body.slice(needIndex + 4).trim();
  
//         const quantityMatch = needPart.match(/\d+/);
//         quantity = quantityMatch ? parseInt(quantityMatch[0], 10) : null;
  
//         message = ACCEPTED_NEEDS.find(word => needPart.toLowerCase().includes(word)) || '';
//     } else {
//         location = body;
//         message = '';
//         quantity = null;
//     }
  
//     const addressComponents = parseIndianAddress(location);
  
//     const formattedAddress = [
//         addressComponents.street,
//         addressComponents.city,
//         addressComponents.state,
//         addressComponents.pincode
//     ].filter(Boolean).join(', ');
  
//     return {
//         location: formattedAddress,
//         message,
//         quantity,
//         addressComponents,
//         isValid: message.length > 0
//     };
// }

async function processSMS(req, res) {
    const { Body: body, From: from } = req.body;
    console.log('SMS: Received message', { from, body });
    const status=1;
    try{
        await saveToFirestore('sms_messages', { body, status, timestamp: new Date() });
        console.log('data stored in firebase');
        await twilioSmsClient.messages.create({
            body: `Your request has been received and is being processed. Help is on the way.`,
            from: smsPhoneNumber,
            to: from
        });
    }catch{
        console.log("data not stored in firebase");
    }
    
    // try {
    //     const parsedMessage = await parseMessage(body);
    //     if (!parsedMessage.isValid) {
    //         throw new Error('Invalid message format');
    //     }

    //     const coordinates = await geocodeAddress(parsedMessage.location);

    //     const requestData = {
    //         type: 'sms',
    //         from,
    //         body: body,
    //         address: parsedMessage.location,
    //         need: parsedMessage.message,
    //         quantity: parsedMessage.quantity,
    //         latitude: coordinates?.lat || null,
    //         longitude: coordinates?.lng || null,
    //         timestamp: new Date()
    //     };

    //     await saveRequest('sms', requestData.need, requestData.quantity, requestData.address, coordinates);
        
        // await twilioSmsClient.messages.create({
        //     body: `Your request for ${requestData.quantity || ''} ${requestData.need} at ${requestData.address} has been received and is being processed. Help is on the way.`,
        //     from: smsPhoneNumber,
        //     to: from
        // });

    //     console.log('SMS: Request processed and saved successfully');
    //     res.status(200).send('SMS processed successfully');
    // } catch (error) {
    //     console.error('SMS: Error processing message:', error.message);
    //     res.status(500).send('Error processing SMS');

    //     try {
    //         await twilioSmsClient.messages.create({
    //             body: `We encountered an error processing your request. Please ensure your message includes your location and need (e.g., "123 Main St, Chennai need 2 food"). Accepted needs are: ${ACCEPTED_NEEDS.join(', ')}.`,
    //             from: smsPhoneNumber,
    //             to: from
    //         });
    //     } catch (smsError) {
    //         console.error('Failed to send error SMS:', smsError.message);
    //     }
    // }
}

module.exports = { processSMS };