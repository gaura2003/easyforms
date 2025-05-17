/**
 * Subscription History controller
 */

exports.getSubscriptionHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const db = req.app.locals.db;
    
    // Get subscription history with plan details
    const [history] = await db.query(
      'SELECT sh.*, sp.name as plan_name, sp.monthly_price, sp.yearly_price ' +
      'FROM subscription_history sh ' +
      'JOIN subscription_plans sp ON sh.plan_id = sp.id ' +
      'WHERE sh.user_id = ? ' +
      'ORDER BY sh.created_at DESC',
      [userId]
    );
    
    res.json({ subscriptionHistory: history });
  } catch (error) {
    console.error('Error fetching subscription history:', error);
    res.status(500).json({ message: 'Error fetching subscription history' });
  }
};

exports.addSubscriptionHistoryEntry = async (req, res) => {
  try {
    const userId = req.user.id;
    const { plan_id, subscription_id, status, billing_cycle, start_date, end_date } = req.body;
    const db = req.app.locals.db;
    
    // Validate required fields
    if (!plan_id || !status || !billing_cycle || !start_date) {
      return res.status(400).json({ message: 'Plan ID, status, billing cycle, and start date are required' });
    }
    
    // Validate status
    const validStatuses = ['active', 'cancelled', 'expired', 'upgraded', 'downgraded'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid subscription status' });
    }
    
    // Validate billing cycle
    const validBillingCycles = ['monthly', 'yearly'];
    if (!validBillingCycles.includes(billing_cycle)) {
      return res.status(400).json({ message: 'Invalid billing cycle' });
    }
    
    // Insert the subscription history entry
    const [result] = await db.query(
      'INSERT INTO subscription_history (user_id, plan_id, subscription_id, status, billing_cycle, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, plan_id, subscription_id, status, billing_cycle, start_date, end_date]
    );
    
    // Get the newly created history entry with plan details
    const [newEntry] = await db.query(
      'SELECT sh.*, sp.name as plan_name, sp.monthly_price, sp.yearly_price ' +
      'FROM subscription_history sh ' +
      'JOIN subscription_plans sp ON sh.plan_id = sp.id ' +
      'WHERE sh.id = ?',
      [result.insertId]
    );
    
    res.status(201).json({ 
      message: 'Subscription history entry added successfully',
      historyEntry: newEntry[0]
    });
  } catch (error) {
    console.error('Error adding subscription history entry:', error);
    res.status(500).json({ message: 'Error adding subscription history entry' });
  }
};