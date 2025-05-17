/**
 * Controller for handling public form submissions
 */
module.exports = async (req, res) => {
  try {
    const { endpointId } = req.params;
    const formData = req.body;
    const db = req.app.locals.db;
    
    console.log('Received submission for form:', endpointId);
    console.log('Form data:', formData);
    
    // Check if the form exists
    const [forms] = await db.query(
      'SELECT id, user_id, name, redirect_url, spam_protection FROM forms WHERE endpoint_id = ?',
      [endpointId]
    );
    
    if (forms.length === 0) {
      console.error('Form not found with endpoint ID:', endpointId);
      return res.status(404).json({ message: 'Form not found' });
    }
    
    const form = forms[0];
    
    // Check for spam if spam protection is enabled
    if (form.spam_protection) {
      // Check for honeypot field
      if (formData._gotcha) {
        console.log('Spam detected: honeypot field filled');
        // Return success to avoid spam bots knowing they were detected
        return res.redirect(form.redirect_url || '/success');
      }
    }
    
    // Remove any internal fields (starting with _)
    const cleanedData = {};
    for (const key in formData) {
      if (!key.startsWith('_')) {
        cleanedData[key] = formData[key];
      }
    }
    
    // Store the submission in the database
    await db.query(
      'INSERT INTO submissions (form_id, data, ip_address, user_agent, created_at) VALUES (?, ?, ?, ?, NOW())',
      [
        form.id,
        JSON.stringify(cleanedData),
        req.ip,
        req.headers['user-agent'] || ''
      ]
    );
    
    console.log('Submission stored successfully');
    
    // Check if we need to send email notification
    const [userResult] = await db.query(
      'SELECT email FROM users WHERE id = ?',
      [form.user_id]
    );
    
    if (userResult.length > 0) {
      const userEmail = userResult[0].email;
      // Here you would implement email notification
      // This is a placeholder for future implementation
      console.log(`Email notification would be sent to: ${userEmail}`);
    }
    
    // Redirect to success page or custom redirect URL
    if (form.redirect_url) {
      return res.redirect(form.redirect_url);
    } else {
      // If no redirect URL is specified, return a success message
      return res.status(200).send(`
        <html>
          <head>
            <title>Form Submitted</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                text-align: center;
              }
              h1 {
                color: #4CAF50;
              }
              .card {
                background-color: #f9f9f9;
                border-radius: 8px;
                padding: 20px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                margin-top: 20px;
              }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>Thank You!</h1>
              <p>Your form has been submitted successfully.</p>
            </div>
          </body>
        </html>
      `);
    }
  } catch (error) {
    console.error('Error processing form submission:', error);
    res.status(500).json({ message: 'Server error' });
  }
};