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
    
    // Get submissions with pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    const [submissions] = await db.query(
      'SELECT * FROM submissions WHERE form_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [formId, limit, offset]
    );
    
    const [total] = await db.query(
      'SELECT COUNT(*) as count FROM submissions WHERE form_id = ?',
      [formId]
    );
    
    res.status(200).json({
      submissions,
      pagination: {
        total: total[0].count,
        page,
        limit,
        pages: Math.ceil(total[0].count / limit)
      }
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
    
    res.status(200).json({ submission: submissions[0] });
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