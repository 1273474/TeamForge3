const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database/connection');

const router = express.Router();

// Validation middleware
const validateTeam = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Team name must be between 1 and 100 characters'),
];

const validateJoinTeam = [
  body('invite_code')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Invite code is required'),
];

// Helper function to generate invite code
const generateInviteCode = () => {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
};

// Create a new team
router.post('/', validateTeam, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name } = req.body;
    const userId = req.user.id;
    const inviteCode = generateInviteCode();

    // Create team
    const result = await db.run(
      'INSERT INTO teams (name, invite_code, created_by) VALUES (?, ?, ?)',
      [name, inviteCode, userId]
    );

    const teamId = result.id;

    // Add creator as admin
    await db.run(
      'INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, ?)',
      [teamId, userId, 'admin']
    );

    // Get created team with role
    const team = await db.get(`
      SELECT t.*, tm.role 
      FROM teams t 
      JOIN team_members tm ON t.id = tm.team_id 
      WHERE t.id = ? AND tm.user_id = ?
    `, [teamId, userId]);

    res.status(201).json(team);
  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({ error: 'Failed to create team' });
  }
});

// Join a team
router.post('/join', validateJoinTeam, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { invite_code } = req.body;
    const userId = req.user.id;

    // Find team by invite code
    const team = await db.get(
      'SELECT * FROM teams WHERE invite_code = ?',
      [invite_code]
    );

    if (!team) {
      return res.status(404).json({ error: 'Invalid invite code' });
    }

    // Check if user is already a member
    const existingMember = await db.get(
      'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?',
      [team.id, userId]
    );

    if (existingMember) {
      return res.status(400).json({ error: 'You are already a member of this team' });
    }

    // Add user as team member
    await db.run(
      'INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, ?)',
      [team.id, userId, 'member']
    );

    // Return team with user's role
    const teamWithRole = { ...team, role: 'member' };
    res.json(teamWithRole);
  } catch (error) {
    console.error('Error joining team:', error);
    res.status(500).json({ error: 'Failed to join team' });
  }
});

// Get user's teams
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;

    const teams = await db.all(`
      SELECT t.*, tm.role, tm.joined_at,
             (SELECT COUNT(*) FROM team_members tm2 WHERE tm2.team_id = t.id) as member_count
      FROM teams t 
      JOIN team_members tm ON t.id = tm.team_id 
      WHERE tm.user_id = ? 
      ORDER BY t.created_at DESC
    `, [userId]);

    res.json(teams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
});

// Get specific team
router.get('/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;
    const userId = req.user.id;

    // Check if user is a member
    const membership = await db.get(
      'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?',
      [teamId, userId]
    );

    if (!membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get team details
    const team = await db.get(`
      SELECT t.*, tm.role,
             (SELECT COUNT(*) FROM team_members tm2 WHERE tm2.team_id = t.id) as member_count
      FROM teams t 
      JOIN team_members tm ON t.id = tm.team_id 
      WHERE t.id = ? AND tm.user_id = ?
    `, [teamId, userId]);

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.json(team);
  } catch (error) {
    console.error('Error fetching team:', error);
    res.status(500).json({ error: 'Failed to fetch team' });
  }
});

// Get team members
router.get('/:teamId/members', async (req, res) => {
  try {
    const { teamId } = req.params;
    const userId = req.user.id;

    // Check if user is a member
    const membership = await db.get(
      'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?',
      [teamId, userId]
    );

    if (!membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get team members
    const members = await db.all(`
      SELECT u.id, u.name, u.email, u.picture, tm.role, tm.joined_at
      FROM users u
      JOIN team_members tm ON u.id = tm.user_id
      WHERE tm.team_id = ?
      ORDER BY tm.joined_at ASC
    `, [teamId]);

    res.json(members);
  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
});

// Update team
router.put('/:teamId', validateTeam, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { teamId } = req.params;
    const { name } = req.body;
    const userId = req.user.id;

    // Check if user is admin
    const membership = await db.get(
      'SELECT * FROM team_members WHERE team_id = ? AND user_id = ? AND role = ?',
      [teamId, userId, 'admin']
    );

    if (!membership) {
      return res.status(403).json({ error: 'Only team admins can update team details' });
    }

    // Update team
    await db.run(
      'UPDATE teams SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name, teamId]
    );

    // Get updated team
    const team = await db.get(`
      SELECT t.*, tm.role 
      FROM teams t 
      JOIN team_members tm ON t.id = tm.team_id 
      WHERE t.id = ? AND tm.user_id = ?
    `, [teamId, userId]);

    res.json(team);
  } catch (error) {
    console.error('Error updating team:', error);
    res.status(500).json({ error: 'Failed to update team' });
  }
});

// Leave team
router.delete('/:teamId/leave', async (req, res) => {
  try {
    const { teamId } = req.params;
    const userId = req.user.id;

    // Check if user is a member
    const membership = await db.get(
      'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?',
      [teamId, userId]
    );

    if (!membership) {
      return res.status(404).json({ error: 'You are not a member of this team' });
    }

    // Check if user is the only admin
    if (membership.role === 'admin') {
      const adminCount = await db.get(
        'SELECT COUNT(*) as count FROM team_members WHERE team_id = ? AND role = ?',
        [teamId, 'admin']
      );

      if (adminCount.count === 1) {
        const memberCount = await db.get(
          'SELECT COUNT(*) as count FROM team_members WHERE team_id = ?',
          [teamId]
        );

        if (memberCount.count > 1) {
          return res.status(400).json({ 
            error: 'Cannot leave team. You are the only admin. Promote someone else to admin first.' 
          });
        }
      }
    }

    // Remove user from team
    await db.run(
      'DELETE FROM team_members WHERE team_id = ? AND user_id = ?',
      [teamId, userId]
    );

    // If no members left, delete the team
    const remainingMembers = await db.get(
      'SELECT COUNT(*) as count FROM team_members WHERE team_id = ?',
      [teamId]
    );

    if (remainingMembers.count === 0) {
      await db.run('DELETE FROM teams WHERE id = ?', [teamId]);
    }

    res.json({ message: 'Left team successfully' });
  } catch (error) {
    console.error('Error leaving team:', error);
    res.status(500).json({ error: 'Failed to leave team' });
  }
});

module.exports = router;
