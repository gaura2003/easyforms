/**
 * Payment Methods controller
 */

exports.getPaymentMethods = async (req, res) => {
  try {
    const userId = req.user.id;
    const db = req.app.locals.db;
    
    // Get all payment methods for the user
    const [paymentMethods] = await db.query(
      'SELECT * FROM payment_methods WHERE user_id = ? ORDER BY is_default DESC, created_at DESC',
      [userId]
    );
    
    res.json({ paymentMethods });
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({ message: 'Error fetching payment methods' });
  }
};

exports.addPaymentMethod = async (req, res) => {
  try {
    const userId = req.user.id;
    const { provider, payment_method_id, last_four, card_type, expiry_month, expiry_year } = req.body;
    const db = req.app.locals.db;
    
    // Validate required fields
    if (!provider || !payment_method_id) {
      return res.status(400).json({ message: 'Provider and payment method ID are required' });
    }
    
    // Check if this is the first payment method (will be set as default)
    const [existingMethods] = await db.query(
      'SELECT COUNT(*) as count FROM payment_methods WHERE user_id = ?',
      [userId]
    );
    
    const isDefault = existingMethods[0].count === 0 ? 1 : 0;
    
    // Insert the new payment method
    const [result] = await db.query(
      'INSERT INTO payment_methods (user_id, provider, payment_method_id, last_four, card_type, expiry_month, expiry_year, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, provider, payment_method_id, last_four, card_type, expiry_month, expiry_year, isDefault]
    );
    
    // Get the newly created payment method
    const [newPaymentMethod] = await db.query(
      'SELECT * FROM payment_methods WHERE id = ?',
      [result.insertId]
    );
    
    res.status(201).json({ 
      message: 'Payment method added successfully',
      paymentMethod: newPaymentMethod[0]
    });
  } catch (error) {
    console.error('Error adding payment method:', error);
    res.status(500).json({ message: 'Error adding payment method' });
  }
};

exports.setDefaultPaymentMethod = async (req, res) => {
  try {
    const userId = req.user.id;
    const { paymentMethodId } = req.params;
    const db = req.app.locals.db;
    
    // Verify the payment method belongs to the user
    const [paymentMethod] = await db.query(
      'SELECT * FROM payment_methods WHERE id = ? AND user_id = ?',
      [paymentMethodId, userId]
    );
    
    if (paymentMethod.length === 0) {
      return res.status(404).json({ message: 'Payment method not found' });
    }
    
    // Start a transaction
    await db.query('START TRANSACTION');
    
    // Remove default status from all payment methods
    await db.query(
      'UPDATE payment_methods SET is_default = 0 WHERE user_id = ?',
      [userId]
    );
    
    // Set the selected payment method as default
    await db.query(
      'UPDATE payment_methods SET is_default = 1 WHERE id = ?',
      [paymentMethodId]
    );
    
    // Commit the transaction
    await db.query('COMMIT');
    
    res.json({ message: 'Default payment method updated successfully' });
  } catch (error) {
    // Rollback in case of error
    await db.query('ROLLBACK');
    console.error('Error setting default payment method:', error);
    res.status(500).json({ message: 'Error setting default payment method' });
  }
};

exports.deletePaymentMethod = async (req, res) => {
  try {
    const userId = req.user.id;
    const { paymentMethodId } = req.params;
    const db = req.app.locals.db;
    
    // Verify the payment method belongs to the user
    const [paymentMethod] = await db.query(
      'SELECT * FROM payment_methods WHERE id = ? AND user_id = ?',
      [paymentMethodId, userId]
    );
    
    if (paymentMethod.length === 0) {
      return res.status(404).json({ message: 'Payment method not found' });
    }
    
    // Check if this is the default payment method
    const isDefault = paymentMethod[0].is_default === 1;
    
    // Start a transaction
    await db.query('START TRANSACTION');
    
    // Delete the payment method
    await db.query(
      'DELETE FROM payment_methods WHERE id = ?',
      [paymentMethodId]
    );
    
    // If this was the default payment method, set another one as default
    if (isDefault) {
      const [remainingMethods] = await db.query(
        'SELECT id FROM payment_methods WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
        [userId]
      );
      
      if (remainingMethods.length > 0) {
        await db.query(
          'UPDATE payment_methods SET is_default = 1 WHERE id = ?',
          [remainingMethods[0].id]
        );
      }
    }
    
    // Commit the transaction
    await db.query('COMMIT');
    
    res.json({ message: 'Payment method deleted successfully' });
  } catch (error) {
    // Rollback in case of error
    await db.query('ROLLBACK');
    console.error('Error deleting payment method:', error);
    res.status(500).json({ message: 'Error deleting payment method' });
  }
};