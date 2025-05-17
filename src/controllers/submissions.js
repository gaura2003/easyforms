exports.getSubmissions = async (req, res) => {
  try {
    const { formId } = req.params;
    const userId = req.userId;
    const db = req.app.locals.db;
    
    // Verify form belongs to user
    const [forms] = await db.query(
      'SELECT * FROM forms WHERE id = ? AND user_id = ?',
      [formId, userId]
    );
    
    if (forms.length === 0) {
      return res.status(404).json({ message: 'Form not found' });
    }
    
    // Get submissions with pagination and filtering
    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.perPage) || 10;
    const offset = (page - 1) * perPage;
    
    // Build query based on filters
    let query = 'SELECT * FROM submissions WHERE form_id = ?';
    let countQuery = 'SELECT COUNT(*) as count FROM submissions WHERE form_id = ?';
    let queryParams = [formId];
    
    // Date range filter
    if (req.query.dateFrom) {
      query += ' AND created_at >= ?';
      countQuery += ' AND created_at >= ?';
      queryParams.push(req.query.dateFrom);
    }
    
    if (req.query.dateTo) {
      query += ' AND created_at <= ?';
      countQuery += ' AND created_at <= ?';
      // Add 1 day to include the end date fully
      const dateTo = new Date(req.query.dateTo);
      dateTo.setDate(dateTo.getDate() + 1);
      queryParams.push(dateTo.toISOString().split('T')[0]);
    }
    
    // Search in submission data
    if (req.query.searchTerm) {
      query += ' AND data LIKE ?';
      countQuery += ' AND data LIKE ?';
      queryParams.push(`%${req.query.searchTerm}%`);
    }
    
    // Sorting
    const sortBy = ['created_at', 'ip_address'].includes(req.query.sortBy) 
      ? req.query.sortBy 
      : 'created_at';
    
    const sortOrder = req.query.sortOrder === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortBy} ${sortOrder}`;
    
    // Add pagination
    query += ' LIMIT ? OFFSET ?';
    queryParams.push(perPage, offset);
    
    // Execute queries
    const [submissions] = await db.query(query, queryParams);
    const [total] = await db.query(countQuery, queryParams.slice(0, -2)); // Remove limit and offset params
    
    // Parse submission data
    const parsedSubmissions = submissions.map(submission => ({
      ...submission,
      data: JSON.parse(submission.data)
    }));
    
    res.status(200).json({
      submissions: parsedSubmissions,
      totalSubmissions: total[0].count,
      totalPages: Math.ceil(total[0].count / perPage),
      currentPage: page,
      perPage
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getSubmissionById = async (req, res) => {
  try {
    const { formId, submissionId } = req.params;
    const userId = req.userId;
    const db = req.app.locals.db;
    
    // Verify form belongs to user
    const [forms] = await db.query(
      'SELECT * FROM forms WHERE id = ? AND user_id = ?',
      [formId, userId]
    );
    
    if (forms.length === 0) {
      return res.status(404).json({ message: 'Form not found' });
    }
    
    // Get submission
    const [submissions] = await db.query(
      'SELECT * FROM submissions WHERE id = ? AND form_id = ?',
      [submissionId, formId]
    );
    
    if (submissions.length === 0) {
      return res.status(404).json({ message: 'Submission not found' });
    }
    
    // Parse submission data
    const submission = {
      ...submissions[0],
      data: JSON.parse(submissions[0].data)
    };
    
    res.status(200).json({ submission });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteSubmission = async (req, res) => {
  try {
    const { formId, submissionId } = req.params;
    const userId = req.userId;
    const db = req.app.locals.db;
    
    // Verify form belongs to user
    const [forms] = await db.query(
      'SELECT * FROM forms WHERE id = ? AND user_id = ?',
      [formId, userId]
    );
    
    if (forms.length === 0) {
      return res.status(404).json({ message: 'Form not found' });
    }
    
    // Delete submission
    const [result] = await db.query(
      'DELETE FROM submissions WHERE id = ? AND form_id = ?',
      [submissionId, formId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Submission not found' });
    }
    
    res.status(200).json({ message: 'Submission deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.exportSubmissions = async (req, res) => {
  try {
    const { formId } = req.params;
    const userId = req.userId;
    const db = req.app.locals.db;
    
    // Verify form belongs to user
    const [forms] = await db.query(
      'SELECT * FROM forms WHERE id = ? AND user_id = ?',
      [formId, userId]
    );
    
    if (forms.length === 0) {
      return res.status(404).json({ message: 'Form not found' });
    }
    
    // Build query based on filters
    let query = 'SELECT * FROM submissions WHERE form_id = ?';
    let queryParams = [formId];
    
    // Date range filter
    if (req.query.dateFrom) {
      query += ' AND created_at >= ?';
      queryParams.push(req.query.dateFrom);
    }
    
    if (req.query.dateTo) {
      query += ' AND created_at <= ?';
      // Add 1 day to include the end date fully
      const dateTo = new Date(req.query.dateTo);
      dateTo.setDate(dateTo.getDate() + 1);
      queryParams.push(dateTo.toISOString().split('T')[0]);
    }
    
    // Search in submission data
    if (req.query.searchTerm) {
      query += ' AND data LIKE ?';
      queryParams.push(`%${req.query.searchTerm}%`);
    }
    
    // Sorting
    const sortBy = ['created_at', 'ip_address'].includes(req.query.sortBy) 
      ? req.query.sortBy 
      : 'created_at';
    
    const sortOrder = req.query.sortOrder === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortBy} ${sortOrder}`;
    
    // Get submissions
    const [submissions] = await db.query(query, queryParams);
    
    // Check if there are any submissions
    if (submissions.length === 0) {
      return res.status(404).json({ message: 'No submissions found' });
    }
    
    // Parse all submissions data to get all possible fields
    const parsedSubmissions = submissions.map(sub => ({
      ...sub,
      data: JSON.parse(sub.data)
    }));
    
    // Get all unique field names from all submissions
    const allFields = new Set();
    parsedSubmissions.forEach(sub => {
      Object.keys(sub.data).forEach(key => allFields.add(key));
    });
    
    // Convert to array and sort alphabetically
    const fieldNames = Array.from(allFields).sort();
    
    // Create CSV header row
    let csv = 'ID,Date,IP Address,' + fieldNames.join(',') + '\n';
    
    // Add data rows
    parsedSubmissions.forEach(sub => {
      let row = [
        sub.id,
        new Date(sub.created_at).toISOString(),
        sub.ip_address || ''
      ];
      
      // Add each field value, handling missing fields
      fieldNames.forEach(field => {
        let value = sub.data[field] || '';
        // Escape commas and quotes in the value
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
        row.push(value);
      });
      
      csv += row.join(',') + '\n';
    });
    
    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=form-${formId}-submissions.csv`);
    
    // Send CSV data
    res.send(csv);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getSubmissionStats = async (req, res) => {
  try {
    const { formId } = req.params;
    const userId = req.userId;
    const db = req.app.locals.db;
    
    // Verify form belongs to user
    const [forms] = await db.query(
      'SELECT * FROM forms WHERE id = ? AND user_id = ?',
      [formId, userId]
    );
    
    if (forms.length === 0) {
      return res.status(404).json({ message: 'Form not found' });
    }
    
    // Get total submissions count
    const [totalCount] = await db.query(
      'SELECT COUNT(*) as count FROM submissions WHERE form_id = ?',
      [formId]
    );
    
    // Get submissions by date (last 30 days)
    const [submissionsByDate] = await db.query(
      'SELECT DATE(created_at) as date, COUNT(*) as count ' +
      'FROM submissions ' +
      'WHERE form_id = ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) ' +
      'GROUP BY DATE(created_at) ' +
      'ORDER BY date',
      [formId]
    );
    
    // Get submissions by hour of day
    const [submissionsByHour] = await db.query(
      'SELECT HOUR(created_at) as hour, COUNT(*) as count ' +
      'FROM submissions ' +
      'WHERE form_id = ? ' +
      'GROUP BY HOUR(created_at) ' +
      'ORDER BY hour',
      [formId]
    );
    
    // Get submissions by day of week
    const [submissionsByDayOfWeek] = await db.query(
      'SELECT WEEKDAY(created_at) as day, COUNT(*) as count ' +
      'FROM submissions ' +
      'WHERE form_id = ? ' +
      'GROUP BY WEEKDAY(created_at) ' +
      'ORDER BY day',
      [formId]
    );
    
    // Get top 10 IP addresses
    const [topIpAddresses] = await db.query(
      'SELECT ip_address, COUNT(*) as count ' +
      'FROM submissions ' +
      'WHERE form_id = ? AND ip_address IS NOT NULL ' +
      'GROUP BY ip_address ' +
      'ORDER BY count DESC ' +
      'LIMIT 10',
      [formId]
    );
    
    res.status(200).json({
      totalSubmissions: totalCount[0].count,
      submissionsByDate,
      submissionsByHour,
      submissionsByDayOfWeek,
      topIpAddresses
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteAllSubmissions = async (req, res) => {
  try {
    const { formId } = req.params;
    const userId = req.userId;
    const db = req.app.locals.db;
    
    // Verify form belongs to user
    const [forms] = await db.query(
      'SELECT * FROM forms WHERE id = ? AND user_id = ?',
      [formId, userId]
    );
    
    if (forms.length === 0) {
      return res.status(404).json({ message: 'Form not found' });
    }
    
    // Delete all submissions for this form
    const [result] = await db.query(
      'DELETE FROM submissions WHERE form_id = ?',
      [formId]
    );
    
    res.status(200).json({ 
      message: 'All submissions deleted successfully',
      count: result.affectedRows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
