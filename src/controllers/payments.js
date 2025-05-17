/**
 * Payments controller
 */

exports.getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const db = req.app.locals.db;
    
    // Get pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    // Get payments with pagination
    const [payments] = await db.query(
      'SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [userId, limit, offset]
    );
    
    // Get total count for pagination
    const [totalCount] = await db.query(
      'SELECT COUNT(*) as count FROM payments WHERE user_id = ?',
      [userId]
    );
    
    res.json({
      payments,
      pagination: {
        total: totalCount[0].count,
        page,
        limit,
        pages: Math.ceil(totalCount[0].count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ message: 'Error fetching payment history' });
  }
};

exports.getPaymentDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const { paymentId } = req.params;
    const db = req.app.locals.db;
    
    // Get the payment details
    const [payment] = await db.query(
      'SELECT * FROM payments WHERE id = ? AND user_id = ?',
      [paymentId, userId]
    );
    
    if (payment.length === 0) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    
    res.json({ payment: payment[0] });
  } catch (error) {
    console.error('Error fetching payment details:', error);
    res.status(500).json({ message: 'Error fetching payment details' });
  }
};

exports.createPayment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { subscription_id, amount, currency, payment_method, payment_id, status } = req.body;
    const db = req.app.locals.db;
    
    // Validate required fields
    if (!amount || !payment_method || !payment_id) {
      return res.status(400).json({ message: 'Amount, payment method, and payment ID are required' });
    }
    
    // Insert the payment record
    const [result] = await db.query(
      'INSERT INTO payments (user_id, subscription_id, amount, currency, payment_method, payment_id, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, subscription_id, amount, currency || 'USD', payment_method, payment_id, status || 'completed']
    );
    
    // Get the newly created payment
    const [newPayment] = await db.query(
      'SELECT * FROM payments WHERE id = ?',
      [result.insertId]
    );
    
    res.status(201).json({ 
      message: 'Payment recorded successfully',
      payment: newPayment[0]
    });
  } catch (error) {
    console.error('Error creating payment record:', error);
    res.status(500).json({ message: 'Error creating payment record' });
  }
};

exports.updatePaymentStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { paymentId } = req.params;
    const { status } = req.body;
    const db = req.app.locals.db;
    
    // Validate status
    const validStatuses = ['pending', 'completed', 'failed', 'refunded'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid payment status' });
    }
    
    // Verify the payment belongs to the user
    const [payment] = await db.query(
      'SELECT * FROM payments WHERE id = ? AND user_id = ?',
      [paymentId, userId]
    );
    
    if (payment.length === 0) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    
    // Update the payment status
    await db.query(
      'UPDATE payments SET status = ? WHERE id = ?',
      [status, paymentId]
    );
    
    res.json({ message: 'Payment status updated successfully' });
  } catch (error) {
    console.error('Error updating payment status:', error);
    res.status(500).json({ message: 'Error updating payment status' });
  }
};