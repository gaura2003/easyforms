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
    
    // Get user's subscription status
    const [userSubscription] = await db.query(
      'SELECT subscription_status, subscription_end_date FROM users WHERE id = ?',
      [userId]
    );
    
    // Return all stats
    res.json({
      overview: {
        totalForms,
        totalSubmissions,
        subscriptionStatus: userSubscription[0].subscription_status,
        subscriptionEndDate: userSubscription[0].subscription_end_date
      },
      submissionsByDate,
      topForms,
      recentSubmissions: parsedRecentSubmissions
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ message: 'Error fetching statistics' });
  }
};