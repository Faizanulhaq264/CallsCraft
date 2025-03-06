const { generateZoomToken } = require('./utility-functions');

const meetingNumber = 4954003286;
const role = 1;

const token = generateZoomToken(meetingNumber, role);
console.log(token);