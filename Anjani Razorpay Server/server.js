/**
 * @fileoverview Main server script for Anjani Razorpay Server.
 * Starts the Express application on a specified port.
 */

require('dotenv').config();
const app = require('./api/index');
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Razorpay Secure Server running locally on http://localhost:${PORT}`);
});
