exports.getCurrentUser = async (req, res) => {
  try {
    // The user ID is available from the auth middleware
    const userId = req.user.id;
    
    // Get user data from database
    const [users] = await req.app.locals.db.query(
      'SELECT id, name, email, subscription_status, subscription_start_date, subscription_end_date FROM users WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = users[0];
    
    // Return user data
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        subscription: {
          status: user.subscription_status,
          startDate: user.subscription_start_date,
          endDate: user.subscription_end_date
        }
      }
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ message: 'Error fetching user data' });
  }
};