const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database/connection');
const aiService = require('../services/aiService');

const router = express.Router();

// Validation middleware
const validateMessage = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Message content must be between 1 and 5000 characters'),
];

// Helper function to check team membership
const checkTeamMembership = async (teamId, userId) => {
  const membership = await db.get(
    'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?',
    [teamId, userId]
  );
  return membership;
};

// Get messages for a team
router.get('/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;
    const userId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;

    // Check team membership
    const membership = await checkTeamMembership(teamId, userId);
    if (!membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get messages with user info
    const messages = await db.all(`
      SELECT m.*, u.name as user_name, u.picture as user_picture
      FROM messages m
      LEFT JOIN users u ON m.user_id = u.id
      WHERE m.team_id = ?
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `, [teamId, parseInt(limit), parseInt(offset)]);

    // Reverse to get chronological order
    res.json(messages.reverse());
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send a message
router.post('/:teamId', validateMessage, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { teamId } = req.params;
    const { content, mentioned_users } = req.body;
    const userId = req.user.id;

    // Check team membership
    const membership = await checkTeamMembership(teamId, userId);
    if (!membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Insert message
    const result = await db.run(
      'INSERT INTO messages (team_id, user_id, content, mentioned_users) VALUES (?, ?, ?, ?)',
      [teamId, userId, content, mentioned_users ? JSON.stringify(mentioned_users) : null]
    );

    // Get the created message with user info
    const message = await db.get(`
      SELECT m.*, u.name as user_name, u.picture as user_picture
      FROM messages m
      LEFT JOIN users u ON m.user_id = u.id
      WHERE m.id = ?
    `, [result.id]);

    // Handle AI mentions
    if (content.toLowerCase().includes('@ai')) {
      try {
        await aiService.handleAIMessage(teamId, content, req.user);
      } catch (aiError) {
        console.error('AI service error:', aiError);
        // Don't fail the message sending if AI fails
      }
    }

    // Handle task assignments
    if (content.match(/@(\w+)\s+(.+)/) && !content.toLowerCase().includes('@ai')) {
      try {
        await handleTaskAssignment(teamId, content, req.user);
      } catch (taskError) {
        console.error('Task assignment error:', taskError);
      }
    }

    // Handle task removal
    if (content.toLowerCase().match(/remove task @(\w+)\s+(.+)/)) {
      try {
        await handleTaskRemoval(teamId, content, req.user);
      } catch (taskError) {
        console.error('Task removal error:', taskError);
      }
    }

    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Helper function to handle task assignment
const handleTaskAssignment = async (teamId, message, user) => {
  const mentionMatch = message.match(/@(\w+)\s+(.+)/);
  if (!mentionMatch) return;

  const mentionedUsername = mentionMatch[1];
  const taskDescription = mentionMatch[2].trim();

  // Skip if this is just a regular mention
  if (taskDescription.length < 3) return;

  // Clean task title and extract due date
  const { cleanDescription, dueDate } = extractDueDateFromMessage(taskDescription);
  const cleanTitle = cleanTaskTitle(cleanDescription);

  // Find mentioned user by name
  const mentionedUser = await db.get(
    'SELECT id FROM users WHERE LOWER(name) LIKE ?',
    [`%${mentionedUsername.toLowerCase()}%`]
  );

  const assignedTo = mentionedUser ? mentionedUser.id : null;

  // Create task
  const result = await db.run(
    'INSERT INTO tasks (team_id, title, assigned_to, created_by, status, priority, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [teamId, cleanTitle, assignedTo, user.id, 'todo', 'medium', dueDate]
  );

  if (result.id) {
    // Send confirmation message
    const confirmationMessage = `✅ Task assigned to @${mentionedUsername}: "${cleanTitle}"${dueDate ? `\n📅 Due: ${dueDate}` : ''}\n\nThis task has been added to the Kanban board under "To Do".`;
    
    await db.run(
      'INSERT INTO messages (team_id, user_id, content, message_type) VALUES (?, ?, ?, ?)',
      [teamId, null, confirmationMessage, 'ai']
    );
  }
};

// Helper function to handle task removal
const handleTaskRemoval = async (teamId, message, user) => {
  const removeMatch = message.match(/remove task @(\w+)\s+(.+)/i);
  if (!removeMatch) return;

  const mentionedUsername = removeMatch[1];
  const taskDescription = removeMatch[2].trim();

  // Find mentioned user
  const mentionedUser = await db.get(
    'SELECT id FROM users WHERE LOWER(name) LIKE ?',
    [`%${mentionedUsername.toLowerCase()}%`]
  );

  if (!mentionedUser) {
    await db.run(
      'INSERT INTO messages (team_id, user_id, content, message_type) VALUES (?, ?, ?, ?)',
      [teamId, null, `❌ User @${mentionedUsername} not found.`, 'ai']
    );
    return;
  }

  // Find tasks for the user
  const tasks = await db.all(
    'SELECT * FROM tasks WHERE team_id = ? AND assigned_to = ?',
    [teamId, mentionedUser.id]
  );

  // Find best matching task
  let bestMatch = null;
  let bestScore = 0;

  for (const task of tasks) {
    const taskTitle = task.title.toLowerCase();
    const searchDesc = taskDescription.toLowerCase();
    
    const searchWords = searchDesc.split(' ').filter(word => word.length > 2);
    const matchedWords = searchWords.filter(word => taskTitle.includes(word));
    
    let score = matchedWords.length / searchWords.length;
    
    if (taskTitle.includes(searchDesc) || searchDesc.includes(taskTitle)) {
      score += 0.5;
    }
    
    if (score > bestScore && score > 0.3) {
      bestScore = score;
      bestMatch = task;
    }
  }

  if (bestMatch) {
    await db.run('DELETE FROM tasks WHERE id = ?', [bestMatch.id]);
    
    await db.run(
      'INSERT INTO messages (team_id, user_id, content, message_type) VALUES (?, ?, ?, ?)',
      [teamId, null, `🗑️ Task removed from @${mentionedUsername}'s list: "${bestMatch.title}"\n\nThe task has been deleted from the Kanban board.`, 'ai']
    );
  } else {
    const taskList = tasks.length > 0 
      ? tasks.map(t => `• ${t.title}`).join('\n')
      : 'No tasks found';
    
    await db.run(
      'INSERT INTO messages (team_id, user_id, content, message_type) VALUES (?, ?, ?, ?)',
      [teamId, null, `❌ Couldn't find a matching task for @${mentionedUsername}.\n\n**Current tasks:**\n${taskList}\n\nTry being more specific with the task description.`, 'ai']
    );
  }
};

// Helper functions
const cleanTaskTitle = (rawTitle) => {
  return rawTitle
    .replace(/^(please\s+|could\s+you\s+|can\s+you\s+)/i, '')
    .replace(/\s+(please|thanks?|thank\s+you)$/i, '')
    .trim();
};

const extractDueDateFromMessage = (description) => {
  const dueDatePatterns = [
    { 
      pattern: /\s+by\s+tonight/i, 
      getValue: () => {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        return today.toISOString().split('T')[0];
      }
    },
    { 
      pattern: /\s+by\s+tomorrow/i, 
      getValue: () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
      }
    },
    { 
      pattern: /\s+by\s+(\d{4}-\d{2}-\d{2})/i, 
      getValue: (match) => match[1] 
    },
    { 
      pattern: /\s+due\s+(\d{4}-\d{2}-\d{2})/i, 
      getValue: (match) => match[1] 
    }
  ];

  for (const { pattern, getValue } of dueDatePatterns) {
    const match = description.match(pattern);
    if (match) {
      const cleanDescription = description.replace(pattern, '').trim();
      const dueDate = getValue(match);
      return { cleanDescription, dueDate };
    }
  }

  return { cleanDescription: description, dueDate: null };
};

module.exports = router;
