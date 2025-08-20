const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database/connection');

const router = express.Router();

// Validation middleware
const validateTask = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Task title must be between 1 and 200 characters'),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Task description must not exceed 1000 characters'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be low, medium, or high'),
  body('status')
    .optional()
    .isIn(['todo', 'in_progress', 'done'])
    .withMessage('Status must be todo, in_progress, or done'),
];

// Helper function to check team membership
const checkTeamMembership = async (teamId, userId) => {
  const membership = await db.get(
    'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?',
    [teamId, userId]
  );
  return membership;
};

// Get tasks for a team
router.get('/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;
    const userId = req.user.id;
    const { status, assigned_to } = req.query;

    // Check team membership
    const membership = await checkTeamMembership(teamId, userId);
    if (!membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let query = `
      SELECT t.*, 
             u1.name as assigned_to_name, u1.picture as assigned_to_picture,
             u2.name as created_by_name, u2.picture as created_by_picture
      FROM tasks t
      LEFT JOIN users u1 ON t.assigned_to = u1.id
      LEFT JOIN users u2 ON t.created_by = u2.id
      WHERE t.team_id = ?
    `;
    const params = [teamId];

    if (status) {
      query += ' AND t.status = ?';
      params.push(status);
    }

    if (assigned_to) {
      query += ' AND t.assigned_to = ?';
      params.push(assigned_to);
    }

    query += ' ORDER BY t.created_at DESC';

    const tasks = await db.all(query, params);
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Create a task
router.post('/:teamId', validateTask, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { teamId } = req.params;
    const { title, description, assigned_to, priority = 'medium', due_date } = req.body;
    const userId = req.user.id;

    // Check team membership
    const membership = await checkTeamMembership(teamId, userId);
    if (!membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // If assigned_to is provided, check if they're a team member
    if (assigned_to) {
      const assigneeMembership = await checkTeamMembership(teamId, assigned_to);
      if (!assigneeMembership) {
        return res.status(400).json({ error: 'Cannot assign task to non-team member' });
      }
    }

    // Create task
    const result = await db.run(
      'INSERT INTO tasks (team_id, title, description, assigned_to, created_by, priority, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [teamId, title, description, assigned_to, userId, priority, due_date]
    );

    // Get created task with user info
    const task = await db.get(`
      SELECT t.*, 
             u1.name as assigned_to_name, u1.picture as assigned_to_picture,
             u2.name as created_by_name, u2.picture as created_by_picture
      FROM tasks t
      LEFT JOIN users u1 ON t.assigned_to = u1.id
      LEFT JOIN users u2 ON t.created_by = u2.id
      WHERE t.id = ?
    `, [result.id]);

    res.status(201).json(task);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update a task
router.put('/:teamId/:taskId', validateTask, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { teamId, taskId } = req.params;
    const updates = req.body;
    const userId = req.user.id;

    // Check team membership
    const membership = await checkTeamMembership(teamId, userId);
    if (!membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if task exists and belongs to team
    const existingTask = await db.get(
      'SELECT * FROM tasks WHERE id = ? AND team_id = ?',
      [taskId, teamId]
    );

    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // If assigned_to is being updated, check if they're a team member
    if (updates.assigned_to) {
      const assigneeMembership = await checkTeamMembership(teamId, updates.assigned_to);
      if (!assigneeMembership) {
        return res.status(400).json({ error: 'Cannot assign task to non-team member' });
      }
    }

    // Build update query
    const fields = [];
    const values = [];

    const allowedFields = ['title', 'description', 'status', 'assigned_to', 'priority', 'due_date'];
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(updates[field]);
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(taskId);

    // Update task
    await db.run(
      `UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    // Get updated task with user info
    const task = await db.get(`
      SELECT t.*, 
             u1.name as assigned_to_name, u1.picture as assigned_to_picture,
             u2.name as created_by_name, u2.picture as created_by_picture
      FROM tasks t
      LEFT JOIN users u1 ON t.assigned_to = u1.id
      LEFT JOIN users u2 ON t.created_by = u2.id
      WHERE t.id = ?
    `, [taskId]);

    res.json(task);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Delete a task
router.delete('/:teamId/:taskId', async (req, res) => {
  try {
    const { teamId, taskId } = req.params;
    const userId = req.user.id;

    // Check team membership
    const membership = await checkTeamMembership(teamId, userId);
    if (!membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if task exists and belongs to team
    const existingTask = await db.get(
      'SELECT * FROM tasks WHERE id = ? AND team_id = ?',
      [taskId, teamId]
    );

    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Only allow task creator or team admins to delete tasks
    if (existingTask.created_by !== userId && membership.role !== 'admin') {
      return res.status(403).json({ error: 'Only task creator or team admin can delete this task' });
    }

    // Delete task
    await db.run('DELETE FROM tasks WHERE id = ?', [taskId]);

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Get task comments
router.get('/:teamId/:taskId/comments', async (req, res) => {
  try {
    const { teamId, taskId } = req.params;
    const userId = req.user.id;

    // Check team membership
    const membership = await checkTeamMembership(teamId, userId);
    if (!membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if task exists and belongs to team
    const task = await db.get(
      'SELECT * FROM tasks WHERE id = ? AND team_id = ?',
      [taskId, teamId]
    );

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Get comments
    const comments = await db.all(`
      SELECT tc.*, u.name as user_name, u.picture as user_picture
      FROM task_comments tc
      JOIN users u ON tc.user_id = u.id
      WHERE tc.task_id = ?
      ORDER BY tc.created_at ASC
    `, [taskId]);

    res.json(comments);
  } catch (error) {
    console.error('Error fetching task comments:', error);
    res.status(500).json({ error: 'Failed to fetch task comments' });
  }
});

// Add task comment
router.post('/:teamId/:taskId/comments', async (req, res) => {
  try {
    const { teamId, taskId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    // Check team membership
    const membership = await checkTeamMembership(teamId, userId);
    if (!membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if task exists and belongs to team
    const task = await db.get(
      'SELECT * FROM tasks WHERE id = ? AND team_id = ?',
      [taskId, teamId]
    );

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Add comment
    const result = await db.run(
      'INSERT INTO task_comments (task_id, user_id, content) VALUES (?, ?, ?)',
      [taskId, userId, content.trim()]
    );

    // Get created comment with user info
    const comment = await db.get(`
      SELECT tc.*, u.name as user_name, u.picture as user_picture
      FROM task_comments tc
      JOIN users u ON tc.user_id = u.id
      WHERE tc.id = ?
    `, [result.id]);

    res.status(201).json(comment);
  } catch (error) {
    console.error('Error adding task comment:', error);
    res.status(500).json({ error: 'Failed to add task comment' });
  }
});

module.exports = router;
