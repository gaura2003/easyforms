/**
 * Subscription Plans controller
 */

exports.getAllPlans = async (req, res) => {
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

exports.getPlanById = async (req, res) => {
  try {
    const { planId } = req.params;
    const db = req.app.locals.db;
    
       // Get the specific plan
    const [plan] = await db.query(
      'SELECT * FROM subscription_plans WHERE id = ?',
      [planId]
    );
    
    if (plan.length === 0) {
      return res.status(404).json({ message: 'Subscription plan not found' });
    }
    
    res.json({ plan: plan[0] });
  } catch (error) {
    console.error('Error fetching subscription plan:', error);
    res.status(500).json({ message: 'Error fetching subscription plan' });
  }
};

exports.comparePlans = async (req, res) => {
  try {
    const db = req.app.locals.db;
    
    // Get all plans with formatted features for comparison
    const [plans] = await db.query(
      'SELECT * FROM subscription_plans ORDER BY monthly_price ASC'
    );
    
    // Format plans for comparison table
    const formattedPlans = plans.map(plan => ({
      id: plan.id,
      name: plan.name,
      monthlyPrice: plan.monthly_price,
      yearlyPrice: plan.yearly_price,
      features: {
        formLimit: plan.form_limit,
        submissionLimit: plan.submission_limit_monthly,
        customRedirect: plan.custom_redirect === 1,
        fileUploads: plan.file_uploads === 1,
        prioritySupport: plan.priority_support === 1
      },
      savingsPercentage: Math.round((1 - (plan.yearly_price / 12) / plan.monthly_price) * 100)
    }));
    
    res.json({ plans: formattedPlans });
  } catch (error) {
    console.error('Error comparing subscription plans:', error);
    res.status(500).json({ message: 'Error comparing subscription plans' });
  }
};

// Admin-only functions (these should be protected with admin middleware)
exports.createPlan = async (req, res) => {
  try {
    const { name, monthly_price, yearly_price, form_limit, submission_limit_monthly, custom_redirect, file_uploads, priority_support } = req.body;
    const db = req.app.locals.db;
    
    // Validate required fields
    if (!name || monthly_price === undefined || yearly_price === undefined || !form_limit || !submission_limit_monthly) {
      return res.status(400).json({ message: 'Missing required plan details' });
    }
    
    // Insert the new plan
    const [result] = await db.query(
      'INSERT INTO subscription_plans (name, monthly_price, yearly_price, form_limit, submission_limit_monthly, custom_redirect, file_uploads, priority_support) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, monthly_price, yearly_price, form_limit, submission_limit_monthly, custom_redirect || 0, file_uploads || 0, priority_support || 0]
    );
    
    // Get the newly created plan
    const [newPlan] = await db.query(
      'SELECT * FROM subscription_plans WHERE id = ?',
      [result.insertId]
    );
    
    res.status(201).json({ 
      message: 'Subscription plan created successfully',
      plan: newPlan[0]
    });
  } catch (error) {
    console.error('Error creating subscription plan:', error);
    res.status(500).json({ message: 'Error creating subscription plan' });
  }
};

exports.updatePlan = async (req, res) => {
  try {
    const { planId } = req.params;
    const { monthly_price, yearly_price, form_limit, submission_limit_monthly, custom_redirect, file_uploads, priority_support } = req.body;
    const db = req.app.locals.db;
    
    // Check if plan exists
    const [plan] = await db.query(
      'SELECT * FROM subscription_plans WHERE id = ?',
      [planId]
    );
    
    if (plan.length === 0) {
      return res.status(404).json({ message: 'Subscription plan not found' });
    }
    
    // Update the plan
    await db.query(
      'UPDATE subscription_plans SET monthly_price = ?, yearly_price = ?, form_limit = ?, submission_limit_monthly = ?, custom_redirect = ?, file_uploads = ?, priority_support = ? WHERE id = ?',
      [
        monthly_price !== undefined ? monthly_price : plan[0].monthly_price,
        yearly_price !== undefined ? yearly_price : plan[0].yearly_price,
        form_limit !== undefined ? form_limit : plan[0].form_limit,
        submission_limit_monthly !== undefined ? submission_limit_monthly : plan[0].submission_limit_monthly,
        custom_redirect !== undefined ? custom_redirect : plan[0].custom_redirect,
        file_uploads !== undefined ? file_uploads : plan[0].file_uploads,
        priority_support !== undefined ? priority_support : plan[0].priority_support,
        planId
      ]
    );
    
    // Get the updated plan
    const [updatedPlan] = await db.query(
      'SELECT * FROM subscription_plans WHERE id = ?',
      [planId]
    );
    
    res.json({ 
      message: 'Subscription plan updated successfully',
      plan: updatedPlan[0]
    });
  } catch (error) {
    console.error('Error updating subscription plan:', error);
    res.status(500).json({ message: 'Error updating subscription plan' });
  }
};

exports.deletePlan = async (req, res) => {
  try {
    const { planId } = req.params;
    const db = req.app.locals.db;
    
    // Check if plan exists
    const [plan] = await db.query(
      'SELECT * FROM subscription_plans WHERE id = ?',
      [planId]
    );
    
    if (plan.length === 0) {
      return res.status(404).json({ message: 'Subscription plan not found' });
    }
    
    // Check if any users are on this plan
    const [usersOnPlan] = await db.query(
      'SELECT COUNT(*) as count FROM users WHERE plan_id = ?',
      [planId]
    );
    
    if (usersOnPlan[0].count > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete plan that has active users',
        usersCount: usersOnPlan[0].count
      });
    }
    
    // Delete the plan
    await db.query(
      'DELETE FROM subscription_plans WHERE id = ?',
      [planId]
    );
    
    res.json({ message: 'Subscription plan deleted successfully' });
  } catch (error) {
    console.error('Error deleting subscription plan:', error);
    res.status(500).json({ message: 'Error deleting subscription plan' });
  }
};
