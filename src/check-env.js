require('dotenv').config();
require('path').resolve(__dirname, './.env')
console.log('Environment Variables:');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Defined' : 'Not defined');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID ? 'Defined' : 'Not defined');