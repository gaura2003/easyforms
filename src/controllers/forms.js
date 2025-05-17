const { v4: uuidv4 } = require('uuid');

exports.createForm = async (req, res) => {
  try {
    const { title, description, fields } = req.body;
    const userId = req.user.id;
    
    // Generate a unique endpoint ID
    const endpointId = generateUniqueId();
    
    // Start a transaction
    const connection = await req.app.locals.db.getConnection();
    await connection.beginTransaction();
    
    try {
      // Insert the form
      const [result] = await connection.query(
        'INSERT INTO forms (user_id, title, description, endpoint_id, created_at) VALUES (?, ?, ?, ?, NOW())',
        [userId, title, description, endpointId]
      );
      
      const formId = result.insertId;
      
      // Insert form fields
      if (fields && fields.length > 0) {
        for (let i = 0; i < fields.length; i++) {
          const field = fields[i];
          await connection.query(
            'INSERT INTO form_fields (form_id, label, type, required, options, position) VALUES (?, ?, ?, ?, ?, ?)',
            [formId, field.label, field.type, field.required ? 1 : 0, JSON.stringify(field.options || []), i]
          );
        }
      }
      
      // Commit the transaction
      await connection.commit();
      
      // Return the created form
      res.status(201).json({
        message: 'Form created successfully',
        form: {
          id: formId,
          title,
          description,
          endpoint_id: endpointId,
          fields: fields || []
        }
      });
    } catch (error) {
      // Rollback the transaction if there's an error
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error creating form:', error);
    res.status(500).json({ message: 'Error creating form' });
  }
};

exports.getAllForms = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get all forms for the current user
    const [forms] = await req.app.locals.db.query(
      'SELECT * FROM forms WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    
    res.json({ forms });
  } catch (error) {
    console.error('Error fetching forms:', error);
    res.status(500).json({ message: 'Error fetching forms' });
  }
};

exports.getFormById = async (req, res) => {
  try {
    const { formId } = req.params;
    const userId = req.user.id;
    
    // Get the form
    const [forms] = await req.app.locals.db.query(
      'SELECT * FROM forms WHERE id = ? AND user_id = ?',
      [formId, userId]
    );
    
    if (forms.length === 0) {
      return res.status(404).json({ message: 'Form not found' });
    }
    
    const form = forms[0];
    
    // Get form fields
    const [fields] = await req.app.locals.db.query(
      'SELECT * FROM form_fields WHERE form_id = ? ORDER BY position ASC',
      [formId]
    );
    
    // Return form with fields
    res.json({
      form: {
        ...form,
        fields
      }
    });
  } catch (error) {
    console.error('Error fetching form:', error);
    res.status(500).json({ message: 'Error fetching form' });
  }
};

exports.updateForm = async (req, res) => {
  try {
    const { formId } = req.params;
    const { title, description, fields } = req.body;
    const userId = req.user.id;
    
    // Check if the form exists and belongs to the user
    const [forms] = await req.app.locals.db.query(
      'SELECT * FROM forms WHERE id = ? AND user_id = ?',
      [formId, userId]
    );
    
    if (forms.length === 0) {
      return res.status(404).json({ message: 'Form not found' });
    }
    
    // Start a transaction
    const connection = await req.app.locals.db.getConnection();
    await connection.beginTransaction();
    
    try {
      // Update the form
      await connection.query(
        'UPDATE forms SET title = ?, description = ?, updated_at = NOW() WHERE id = ?',
        [title, description, formId]
      );
      
      // Delete existing fields
      await connection.query('DELETE FROM form_fields WHERE form_id = ?', [formId]);
      
      // Insert updated fields
      if (fields && fields.length > 0) {
        for (let i = 0; i < fields.length; i++) {
          const field = fields[i];
          await connection.query(
            'INSERT INTO form_fields (form_id, label, type, required, options, position) VALUES (?, ?, ?, ?, ?, ?)',
            [formId, field.label, field.type, field.required ? 1 : 0, JSON.stringify(field.options || []), i]
          );
        }
      }
      
      // Commit the transaction
      await connection.commit();
      
      // Return success
      res.json({
        message: 'Form updated successfully',
        form: {
          id: formId,
          title,
          description,
          fields: fields || []
        }
      });
    } catch (error) {
      // Rollback the transaction if there's an error
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error updating form:', error);
    res.status(500).json({ message: 'Error updating form' });
  }
};

exports.deleteForm = async (req, res) => {
  try {
    const { formId } = req.params;
    const userId = req.user.id;
    
    // Check if the form exists and belongs to the user
    const [forms] = await req.app.locals.db.query(
      'SELECT * FROM forms WHERE id = ? AND user_id = ?',
      [formId, userId]
    );
    
    if (forms.length === 0) {
      return res.status(404).json({ message: 'Form not found' });
    }
    
    // Start a transaction
    const connection = await req.app.locals.db.getConnection();
    await connection.beginTransaction();
    
    try {
      // Delete form fields
      await connection.query('DELETE FROM form_fields WHERE form_id = ?', [formId]);
      
      // Delete form submissions
      await connection.query('DELETE FROM submissions WHERE form_id = ?', [formId]);
      
      // Delete the form
      await connection.query('DELETE FROM forms WHERE id = ?', [formId]);
      
      // Commit the transaction
      await connection.commit();
      
      // Return success
      res.json({ message: 'Form deleted successfully' });
    } catch (error) {
      // Rollback the transaction if there's an error
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error deleting form:', error);
    res.status(500).json({ message: 'Error deleting form' });
  }
};

// Helper function to generate a unique endpoint ID
function generateUniqueId() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}