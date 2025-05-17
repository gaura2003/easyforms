/**
 * Stats controller for providing dashboard statistics
 */

exports.getStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const db = req.app.locals.db;
    
    // Get total forms count
    const [formsResult] = await db.query(
      'SELECT COUNT(*) as total FROM forms WHERE user_id = ?',
      [userId]
    );
    const totalForms = formsResult[0].total;
    
    // Get total submissions count
    const [submissionsResult] = await db.query(
      'SELECT COUNT(*) as total FROM submissions s ' +
      'JOIN forms f ON s.form_id = f.id ' +
      'WHERE f.user_id = ?',
      [userId]
    );
    const totalSubmissions = submissionsResult[0].total;
    
    // Get current month submissions count
    const [currentMonthSubmissions] = await db.query(
      'SELECT COUNT(*) as total FROM submissions s ' +
      'JOIN forms f ON s.form_id = f.id ' +
      'WHERE f.user_id = ? AND MONTH(s.created_at) = MONTH(CURRENT_DATE()) ' +
      'AND YEAR(s.created_at) = YEAR(CURRENT_DATE())',
      [userId]
    );
    const monthlySubmissions = currentMonthSubmissions[0].total;
    
    // Get submissions by date (last 30 days)
    const [submissionsByDate] = await db.query(
      'SELECT DATE(s.created_at) as date, COUNT(*) as count ' +
      'FROM submissions s ' +
      'JOIN forms f ON s.form_id = f.id ' +
      'WHERE f.user_id = ? AND s.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) ' +
      'GROUP BY DATE(s.created_at) ' +
      'ORDER BY date',
      [userId]
    );
    
    // Get top forms by submission count
    const [topForms] = await db.query(
      'SELECT f.id, f.title, COUNT(s.id) as submission_count ' +
      'FROM forms f ' +
      'LEFT JOIN submissions s ON f.id = s.form_id ' +
      'WHERE f.user_id = ? ' +
      'GROUP BY f.id ' +
      'ORDER BY submission_count DESC ' +
      'LIMIT 5',
      [userId]
    );
    
    // Get recent submissions
    const [recentSubmissions] = await db.query(
      'SELECT s.id, s.form_id, f.title as form_title, s.data, s.created_at ' +
      'FROM submissions s ' +
      'JOIN forms f ON s.form_id = f.id ' +
      'WHERE f.user_id = ? ' +
      'ORDER BY s.created_at DESC ' +
      'LIMIT 10',
      [userId]
    );
    
    // Parse submission data JSON
    const parsedRecentSubmissions = recentSubmissions.map(submission => ({
      ...submission,
      data: JSON.parse(submission.data)
    }));
    
    // Get user's subscription details
    const [userSubscription] = await db.query(
      'SELECT u.subscription_tier, u.subscription_status, u.subscription_end_date, ' +
      'sp.form_limit, sp.submission_limit_monthly, sp.custom_redirect, sp.file_uploads, sp.priority_support ' +
      'FROM users u ' +
      'LEFT JOIN subscription_plans sp ON sp.name = u.subscription_tier ' +
      'WHERE u.id = ?',
      [userId]
    );
    
    // Calculate usage percentages
    const formUsagePercentage = Math.round((totalForms / userSubscription[0].form_limit) * 100);
    const submissionUsagePercentage = Math.round((monthlySubmissions / userSubscription[0].submission_limit_monthly) * 100);
    
    // Get subscription history
    const [subscriptionHistory] = await db.query(
      'SELECT sh.status, sh.billing_cycle, sh.start_date, sh.end_date, sp.name as plan_name ' +
      'FROM subscription_history sh ' +
      'JOIN subscription_plans sp ON sh.plan_id = sp.id ' +
      'WHERE sh.user_id = ? ' +
      'ORDER BY sh.created_at DESC ' +
      'LIMIT 5',
      [userId]
    );
    
    // Get payment history
    const [paymentHistory] = await db.query(
      'SELECT amount, currency, payment_method, status, created_at ' +
      'FROM payments ' +
      'WHERE user_id = ? ' +
      'ORDER BY created_at DESC ' +
      'LIMIT 5',
      [userId]
    );
    
    // Return all stats
    res.json({
      overview: {
        totalForms,
        totalSubmissions,
        currentMonthSubmissions: monthlySubmissions,
        subscriptionTier: userSubscription[0].subscription_tier,
        subscriptionStatus: userSubscription[0].subscription_status,
        subscriptionEndDate: userSubscription[0].subscription_end_date,
        formLimit: userSubscription[0].form_limit,
        submissionLimitMonthly: userSubscription[0].submission_limit_monthly,
        formUsagePercentage,
        submissionUsagePercentage,
        planFeatures: {
          customRedirect: userSubscription[0].custom_redirect === 1,
          fileUploads: userSubscription[0].file_uploads === 1,
          prioritySupport: userSubscription[0].priority_support === 1
        }
      },
      submissionsByDate,
      topForms,
      recentSubmissions: parsedRecentSubmissions,
      subscriptionHistory,
      paymentHistory
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ message: 'Error fetching statistics' });
  }
};

/**
 * Get detailed subscription stats
 */
exports.getSubscriptionStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const db = req.app.locals.db;
    
    // Get user's subscription details
    const [userSubscription] = await db.query(
      'SELECT u.subscription_tier, u.subscription_status, u.subscription_start_date, u.subscription_end_date, ' +
      'sp.form_limit, sp.submission_limit_monthly, sp.custom_redirect, sp.file_uploads, sp.priority_support, ' +
      'sp.monthly_price, sp.yearly_price ' +
      'FROM users u ' +
      'LEFT JOIN subscription_plans sp ON sp.name = u.subscription_tier ' +
      'WHERE u.id = ?',
      [userId]
    );
    
    // Get all available plans
    const [allPlans] = await db.query(
      'SELECT id, name, monthly_price, yearly_price, form_limit, submission_limit_monthly, ' +
      'custom_redirect, file_uploads, priority_support ' +
      'FROM subscription_plans ' +
      'ORDER BY monthly_price ASC'
    );
    
    // Get subscription history
    const [subscriptionHistory] = await db.query(
      'SELECT sh.id, sh.status, sh.billing_cycle, sh.start_date, sh.end_date, ' +
      'sp.name as plan_name, sp.monthly_price, sp.yearly_price ' +
      'FROM subscription_history sh ' +
      'JOIN subscription_plans sp ON sh.plan_id = sp.id ' +
      'WHERE sh.user_id = ? ' +
      'ORDER BY sh.created_at DESC',
      [userId]
    );
    
    // Get payment history
    const [paymentHistory] = await db.query(
      'SELECT id, amount, currency, payment_method, payment_id, status, created_at ' +
      'FROM payments ' +
      'WHERE user_id = ? ' +
      'ORDER BY created_at DESC',
      [userId]
    );
    
    // Get payment methods
    const [paymentMethods] = await db.query(
      'SELECT id, provider, payment_method_id, last_four, card_type, ' +
      'expiry_month, expiry_year, is_default ' +
      'FROM payment_methods ' +
      'WHERE user_id = ?',
      [userId]
    );
    
    res.json({
      currentSubscription: userSubscription[0],
      availablePlans: allPlans,
      subscriptionHistory,
      paymentHistory,
      paymentMethods
    });
  } catch (error) {
    console.error('Error fetching subscription stats:', error);
    res.status(500).json({ message: 'Error fetching subscription statistics' });
  }
};

/**
 * Get usage statistics
 */
exports.getUsageStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const db = req.app.locals.db;
    
    // Get forms usage by month
    const [formsCreatedByMonth] = await db.query(
      'SELECT YEAR(created_at) as year, MONTH(created_at) as month, COUNT(*) as count ' +
      'FROM forms ' +
      'WHERE user_id = ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH) ' +
      'GROUP BY YEAR(created_at), MONTH(created_at) ' +
      'ORDER BY year ASC, month ASC',
      [userId]
    );
    
    // Get submissions by month
    const [submissionsByMonth] = await db.query(
      'SELECT YEAR(s.created_at) as year, MONTH(s.created_at) as month, COUNT(*) as count ' +
      'FROM submissions s ' +
      'JOIN forms f ON s.form_id = f.id ' +
      'WHERE f.user_id = ? AND s.created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH) ' +
      'GROUP BY YEAR(s.created_at), MONTH(s.created_at) ' +
      'ORDER BY year ASC, month ASC',
      [userId]
    );
    
    // Get submissions by form
    const [submissionsByForm] = await db.query(
      'SELECT f.id, f.title, f.name, COUNT(s.id) as submission_count ' +
      'FROM forms f ' +
      'LEFT JOIN submissions s ON f.id = s.form_id ' +
      'WHERE f.user_id = ? ' +
      'GROUP BY f.id ' +
      'ORDER BY submission_count DESC',
      [userId]
    );
    
    // Format form names for display
    const formattedSubmissionsByForm = submissionsByForm.map(form => ({
      ...form,
      displayName: form.title || form.name || `Form #${form.id}`
    }));
    
    res.json({
      formsCreatedByMonth,
      submissionsByMonth,
      submissionsByForm: formattedSubmissionsByForm
    });
  } catch (error) {
    console.error('Error fetching usage stats:', error);
    res.status(500).json({ message: 'Error fetching usage statistics' });
  }
};
