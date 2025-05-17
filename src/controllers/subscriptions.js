const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay with API keys from environment variables
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_E5BNM56ZxxZAwk',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'uXo5UAsgnT7zglLrmsH749Je'
});

// Create a subscription
exports.createSubscription = async (req, res) => {
  try {
    const { planId } = req.body;
    const userId = req.user.id;

    // Get the plan details from your database
    const [plans] = await req.app.locals.db.query(
      'SELECT * FROM subscription_plans WHERE id = ?',
      [planId]
    );

    if (plans.length === 0) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    const plan = plans[0];

    // Create a subscription in Razorpay
    const subscription = await razorpay.subscriptions.create({
      plan_id: plan.razorpay_plan_id,
      customer_notify: 1,
      total_count: 12, // 12 months
    });

    // Return the subscription details to the client
    res.json({
      subscription,
      key_id: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ message: 'Failed to create subscription' });
  }
};

// Verify subscription payment
exports.verifySubscription = async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature, plan_id } = req.body;
    const userId = req.user.id;

    // Verify the signature
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_payment_id + '|' + razorpay_subscription_id)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ message: 'Invalid signature' });
    }

    // Get subscription details from Razorpay
    const subscription = await razorpay.subscriptions.fetch(razorpay_subscription_id);

    // Update user's subscription in your database
    await req.app.locals.db.query(
      'UPDATE users SET subscription_id = ?, subscription_status = ?, plan_id = ?, subscription_start_date = NOW(), subscription_end_date = DATE_ADD(NOW(), INTERVAL 1 YEAR) WHERE id = ?',
      [razorpay_subscription_id, subscription.status, plan_id, userId]
    );

    // Return success response
    res.json({ message: 'Subscription verified successfully', subscription });
  } catch (error) {
    console.error('Error verifying subscription:', error);
    res.status(500).json({ message: 'Failed to verify subscription' });
  }
};

// Cancel subscription
exports.cancelSubscription = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's subscription details
    const [users] = await req.app.locals.db.query(
      'SELECT subscription_id FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0 || !users[0].subscription_id) {
      return res.status(404).json({ message: 'No active subscription found' });
    }

    const subscriptionId = users[0].subscription_id;

    // Cancel subscription in Razorpay
    await razorpay.subscriptions.cancel(subscriptionId);

    // Update user's subscription status in your database
    await req.app.locals.db.query(
      'UPDATE users SET subscription_status = "cancelled" WHERE id = ?',
      [userId]
    );

    res.json({ message: 'Subscription cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ message: 'Failed to cancel subscription' });
  }
};

// Webhook handler for subscription events
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

    // Handle different subscription events
    if (event.event === 'subscription.charged') {
      // Payment successful, update subscription status
      const subscriptionId = event.payload.subscription.entity.id;
      
      await req.app.locals.db.query(
        'UPDATE users SET subscription_status = "active" WHERE subscription_id = ?',
        [subscriptionId]
      );
    } else if (event.event === 'subscription.cancelled') {
      // Subscription cancelled
      const subscriptionId = event.payload.subscription.entity.id;
      
      await req.app.locals.db.query(
        'UPDATE users SET subscription_status = "cancelled" WHERE subscription_id = ?',
        [subscriptionId]
      );
    } else if (event.event === 'subscription.expired') {
      // Subscription expired
      const subscriptionId = event.payload.subscription.entity.id;
      
      await req.app.locals.db.query(
        'UPDATE users SET subscription_status = "expired" WHERE subscription_id = ?',
        [subscriptionId]
      );
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ message: 'Failed to process webhook' });
  }
};

exports.getSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's subscription details
    const [subscriptions] = await req.app.locals.db.query(
      `SELECT u.subscription_id, u.subscription_status, u.subscription_start_date, 
              u.subscription_end_date, p.name as plan_name, p.monthly_price, p.yearly_price, 
              p.form_limit, p.submission_limit_monthly, p.custom_redirect, 
              p.file_uploads, p.priority_support
       FROM users u
       LEFT JOIN subscription_plans p ON u.plan_id = p.id
       WHERE u.id = ?`,
      [userId]
    );
    
    if (subscriptions.length === 0) {
      return res.status(404).json({ message: 'Subscription not found' });
    }
    
    const subscription = subscriptions[0];
    
    // Format the subscription data
    const formattedSubscription = {
      id: subscription.subscription_id,
      status: subscription.subscription_status,
      startDate: subscription.subscription_start_date,
      endDate: subscription.subscription_end_date,
      plan: {
        name: subscription.plan_name,
        pricing: {
          monthly: subscription.monthly_price,
          yearly: subscription.yearly_price
        },
        limits: {
          forms: subscription.form_limit,
          monthlySubmissions: subscription.submission_limit_monthly
        },
        features: {
          customRedirect: subscription.custom_redirect === 1,
          fileUploads: subscription.file_uploads === 1,
          prioritySupport: subscription.priority_support === 1
        }
      }
    };
    
    res.json({ subscription: formattedSubscription });
  } catch (error) {
    console.error('Error getting subscription:', error);
    res.status(500).json({ message: 'Error retrieving subscription details' });
  }
};

