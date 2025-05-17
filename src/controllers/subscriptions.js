const crypto = require('crypto');
const Razorpay = require('razorpay');

// Initialize Razorpay with your key_id and key_secret
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_E5BNM56ZxxZAwk',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'uXo5UAsgnT7zglLrmsH749Je'
});

exports.getPlans = async (req, res) => {
  try {
    const db = req.app.locals.db;
    
    // Get all subscription plans
    const [plans] = await db.query(
      'SELECT * FROM subscription_plans ORDER BY monthly_price ASC'
    );
    
    res.json({ plans });
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    res.status(500).json({ message: 'Error fetching subscription plans' });
  }
};

exports.createSubscription = async (req, res) => {
  try {
    const { planId, interval } = req.body;
    const userId = req.user.id;
    const db = req.app.locals.db;
    
    // Get plan details
    const [plans] = await db.query(
      'SELECT * FROM subscription_plans WHERE id = ?',
      [planId]
    );
    
    if (plans.length === 0) {
      return res.status(404).json({ message: 'Subscription plan not found' });
    }
    
    const plan = plans[0];
    
    // Get user details
    const [users] = await db.query(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = users[0];
    
    // Calculate amount based on interval
    const amount = interval === 'monthly' ? plan.monthly_price : plan.yearly_price;
    const period = interval === 'monthly' ? 'monthly' : 'yearly';
    
    // Create an order in Razorpay instead of a subscription
    // This is simpler for one-time payments
    const options = {
      amount: amount * 100, // Razorpay expects amount in paise
      currency: "INR",
      receipt: `receipt_order_${userId}_${Date.now()}`,
      notes: {
        user_id: userId,
        plan_id: planId,
        plan_name: plan.name,
        interval: period
      }
    };
    
    const order = await razorpay.orders.create(options);
    
    // Update user's subscription info in database
    await db.query(
      'UPDATE users SET subscription_status = ?, plan_id = ? WHERE id = ?',
      ['pending', planId, userId]
    );
    
    // Return order details to client
    res.json({
      order,
      key_id: process.env.RAZORPAY_KEY_ID,
      user
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ message: 'Failed to create subscription', error: error.toString() });
  }
};


exports.verifySubscription = async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
    const userId = req.user.id;
    const db = req.app.locals.db;
    
    // Verify the signature
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');
    
    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ message: 'Invalid signature' });
    }
    
    // Get order details from Razorpay
    const order = await razorpay.orders.fetch(razorpay_order_id);
    
    // Get user's pending subscription
    const [users] = await db.query(
      'SELECT plan_id FROM users WHERE id = ? AND subscription_status = ?',
      [userId, 'pending']
    );
    
    if (users.length === 0) {
      return res.status(400).json({ message: 'No pending subscription found' });
    }
    
    const planId = users[0].plan_id;
    
    // Get plan details
    const [plans] = await db.query(
      'SELECT * FROM subscription_plans WHERE id = ?',
      [planId]
    );
    
    if (plans.length === 0) {
      return res.status(404).json({ message: 'Subscription plan not found' });
    }
    
    const plan = plans[0];
    
    // Calculate subscription dates
    const now = new Date();
    const endDate = new Date();
    
    if (order.notes.interval === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }
    
    // Update user's subscription status
    await db.query(
      'UPDATE users SET subscription_tier = ?, subscription_status = ?, subscription_id = ?, subscription_start_date = ?, subscription_end_date = ? WHERE id = ?',
      [plan.name, 'active', razorpay_payment_id, now, endDate, userId]
    );
    
    // Add entry to subscription history
    await db.query(
      'INSERT INTO subscription_history (user_id, plan_id, subscription_id, status, billing_cycle, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        userId,
        planId,
        razorpay_payment_id,
        'active',
        order.notes.interval,
        now,
        endDate
      ]
    );
    
    // Record payment
    await db.query(
      'INSERT INTO payments (user_id, subscription_id, amount, currency, payment_method, payment_id, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        userId,
        razorpay_payment_id,
        order.amount / 100, // Convert from paisa to rupees
        order.currency,
        'razorpay',
        razorpay_payment_id,
        'completed'
      ]
    );
    
    // Get updated user data
    const [updatedUser] = await db.query(
      'SELECT id, email, name, subscription_tier, subscription_status, subscription_start_date, subscription_end_date FROM users WHERE id = ?',
      [userId]
    );
    
    res.json({
      message: 'Payment verified successfully',
      user: updatedUser[0]
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ message: 'Failed to verify payment' });
  }
};


exports.getSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    const db = req.app.locals.db;
    
    // Get user's subscription details
    const [users] = await db.query(
      'SELECT subscription_tier, subscription_status, subscription_id, subscription_start_date, subscription_end_date, plan_id FROM users WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = users[0];
    
    // If user has an active subscription and subscription_id, fetch from Razorpay
    let razorpaySubscription = null;
    if (user.subscription_id && user.subscription_status === 'active') {
      try {
        razorpaySubscription = await razorpay.subscriptions.fetch(user.subscription_id);
      } catch (error) {
        console.error('Error fetching Razorpay subscription:', error);
        // Continue even if Razorpay fetch fails
      }
    }
    
    // Get plan details if user has a plan_id
    let plan = null;
    if (user.plan_id) {
      const [plans] = await db.query(
        'SELECT * FROM subscription_plans WHERE id = ?',
        [user.plan_id]
      );
      
      if (plans.length > 0) {
        plan = plans[0];
      }
    }
    
    res.json({
      subscription: {
        tier: user.subscription_tier,
        status: user.subscription_status,
        startDate: user.subscription_start_date,
        endDate: user.subscription_end_date,
        razorpaySubscription,
        plan
      }
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ message: 'Error fetching subscription details' });
  }
};

exports.cancelSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    const db = req.app.locals.db;
    
    // Get user's subscription details
    const [users] = await db.query(
      'SELECT subscription_id, subscription_status FROM users WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = users[0];
    
    if (!user.subscription_id || user.subscription_status !== 'active') {
      return res.status(400).json({ message: 'No active subscription found' });
    }
    
    // Cancel subscription in Razorpay
    try {
      await razorpay.subscriptions.cancel(user.subscription_id, {
        cancel_at_cycle_end: 1 // Cancel at the end of the current billing cycle
      });
    } catch (error) {
      console.error('Error cancelling Razorpay subscription:', error);
      // Continue even if Razorpay cancellation fails
    }
    
    // Update user's subscription status
    await db.query(
      'UPDATE users SET subscription_status = ? WHERE id = ?',
      ['cancelled', userId]
    );
    
    // Add entry to subscription history
    await db.query(
      'INSERT INTO subscription_history (user_id, plan_id, subscription_id, status, billing_cycle, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        userId,
        user.plan_id,
        user.subscription_id,
        'cancelled',
        'monthly', // Default to monthly if we don't know
        new Date(),
        new Date() // Same date for cancellation
      ]
    );
    
    res.json({ message: 'Subscription cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ message: 'Failed to cancel subscription' });
  }
};

exports.downgradeSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    const db = req.app.locals.db;
    
    // Get user's current subscription
    const [users] = await db.query(
      'SELECT subscription_id, subscription_tier, subscription_status FROM users WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = users[0];
    
    // If user already has free tier, nothing to do
    if (user.subscription_tier === 'free') {
      return res.json({ message: 'User is already on the free plan' });
    }
    
    // If user has an active subscription in Razorpay, cancel it
    if (user.subscription_id && user.subscription_status === 'active') {
      try {
        await razorpay.subscriptions.cancel(user.subscription_id);
      } catch (error) {
        console.error('Error cancelling Razorpay subscription:', error);
        // Continue even if Razorpay cancellation fails
      }
    }
    
    // Get free plan ID
    const [freePlans] = await db.query(
      'SELECT id FROM subscription_plans WHERE name = ?',
      ['free']
    );
    
    if (freePlans.length === 0) {
      return res.status(404).json({ message: 'Free plan not found' });
    }
    
    const freePlanId = freePlans[0].id;
    
    // Update user to free plan
    await db.query(
      'UPDATE users SET subscription_tier = ?, subscription_status = ?, plan_id = ?, subscription_id = NULL, subscription_start_date = NULL, subscription_end_date = NULL WHERE id = ?',
      ['free', 'none', freePlanId, userId]
    );
    
    // Add entry to subscription history
    await db.query(
      'INSERT INTO subscription_history (user_id, plan_id, subscription_id, status, billing_cycle, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        userId,
        freePlanId,
        null,
        'downgraded',
        'monthly', // Default to monthly
        new Date(),
        null
      ]
    );
    
    res.json({ message: 'Successfully downgraded to free plan' });
  } catch (error) {
    console.error('Error downgrading subscription:', error);
    res.status(500).json({ message: 'Failed to downgrade subscription' });
  }
};

exports.handleWebhook = async (req, res) => {
  try {
    const webhookSignature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    
    // Verify webhook signature
    const generated_signature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');
    
        if (generated_signature !== webhookSignature) {
      return res.status(400).json({ message: 'Invalid webhook signature' });
    }
    
    const event = req.body;
    const db = req.app.locals.db;
    
    // Handle different webhook events
    switch (event.event) {
      case 'subscription.authenticated':
        // Subscription was authenticated successfully
        break;
        
      case 'subscription.activated':
        // Subscription was activated
        if (event.payload && event.payload.subscription && event.payload.subscription.entity) {
          const subscription = event.payload.subscription.entity;
          const userId = subscription.notes.user_id;
          const planId = subscription.notes.plan_id;
          
          // Update user's subscription status
          await db.query(
            'UPDATE users SET subscription_status = ? WHERE id = ?',
            ['active', userId]
          );
          
          // Get plan details
          const [plans] = await db.query(
            'SELECT name FROM subscription_plans WHERE id = ?',
            [planId]
          );
          
          if (plans.length > 0) {
            // Update user's subscription tier
            await db.query(
              'UPDATE users SET subscription_tier = ? WHERE id = ?',
              [plans[0].name, userId]
            );
          }
        }
        break;
        
      case 'subscription.charged':
        // Subscription was charged successfully
        if (event.payload && event.payload.subscription && event.payload.payment) {
          const subscription = event.payload.subscription.entity;
          const payment = event.payload.payment.entity;
          const userId = subscription.notes.user_id;
          
          // Record payment
          await db.query(
            'INSERT INTO payments (user_id, subscription_id, amount, currency, payment_method, payment_id, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
              userId,
              subscription.id,
              payment.amount / 100, // Convert from paisa to rupees
              payment.currency,
              'razorpay',
              payment.id,
              'completed'
            ]
          );
          
          // Update subscription end date
          const endDate = new Date();
          if (subscription.plan_id.includes('monthly')) {
            endDate.setMonth(endDate.getMonth() + 1);
          } else {
            endDate.setFullYear(endDate.getFullYear() + 1);
          }
          
          await db.query(
            'UPDATE users SET subscription_end_date = ? WHERE id = ?',
            [endDate, userId]
          );
        }
        break;
        
      case 'subscription.cancelled':
        // Subscription was cancelled
        if (event.payload && event.payload.subscription) {
          const subscription = event.payload.subscription.entity;
          const userId = subscription.notes.user_id;
          
          // Update user's subscription status
          await db.query(
            'UPDATE users SET subscription_status = ? WHERE id = ?',
            ['cancelled', userId]
          );
          
          // Add entry to subscription history
          await db.query(
            'INSERT INTO subscription_history (user_id, plan_id, subscription_id, status, billing_cycle, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
              userId,
              subscription.notes.plan_id,
              subscription.id,
              'cancelled',
              subscription.plan_id.includes('monthly') ? 'monthly' : 'yearly',
              new Date(),
              new Date()
            ]
          );
        }
        break;
        
      case 'subscription.halted':
        // Subscription was halted due to payment failure
        if (event.payload && event.payload.subscription) {
          const subscription = event.payload.subscription.entity;
          const userId = subscription.notes.user_id;
          
          // Update user's subscription status
          await db.query(
            'UPDATE users SET subscription_status = ? WHERE id = ?',
            ['halted', userId]
          );
        }
        break;
        
      case 'subscription.pending':
        // Subscription payment is pending
        break;
        
      case 'payment.failed':
        // Payment failed
        if (event.payload && event.payload.payment) {
          const payment = event.payload.payment.entity;
          
          // If this is for a subscription, record the failed payment
          if (payment.notes && payment.notes.subscription_id) {
            const subscriptionId = payment.notes.subscription_id;
            
            // Get user ID from subscription
            const [subscriptions] = await db.query(
              'SELECT user_id FROM users WHERE subscription_id = ?',
              [subscriptionId]
            );
            
            if (subscriptions.length > 0) {
              const userId = subscriptions[0].user_id;
              
              // Record failed payment
              await db.query(
                'INSERT INTO payments (user_id, subscription_id, amount, currency, payment_method, payment_id, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [
                  userId,
                  subscriptionId,
                  payment.amount / 100,
                  payment.currency,
                  'razorpay',
                  payment.id,
                  'failed'
                ]
              );
            }
          }
        }
        break;
    }
    
    // Acknowledge the webhook
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ message: 'Error processing webhook' });
  }
};

