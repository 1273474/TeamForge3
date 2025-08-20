const db = require('../database/connection');

const socketHandlers = (socket, io) => {
  // Join team rooms
  socket.on('join-team', async (teamId) => {
    try {
      // Verify user is a member of the team
      const membership = await db.get(
        'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?',
        [teamId, socket.userId]
      );

      if (membership) {
        socket.join(`team-${teamId}`);
        socket.currentTeam = teamId;
        console.log(`User ${socket.userId} joined team ${teamId}`);
        
        // Notify other team members
        socket.to(`team-${teamId}`).emit('user-joined', {
          userId: socket.userId,
          teamId: teamId
        });
      } else {
        socket.emit('error', { message: 'Access denied to team' });
      }
    } catch (error) {
      console.error('Error joining team:', error);
      socket.emit('error', { message: 'Failed to join team' });
    }
  });

  // Leave team rooms
  socket.on('leave-team', (teamId) => {
    socket.leave(`team-${teamId}`);
    if (socket.currentTeam === teamId) {
      socket.currentTeam = null;
    }
    console.log(`User ${socket.userId} left team ${teamId}`);
    
    // Notify other team members
    socket.to(`team-${teamId}`).emit('user-left', {
      userId: socket.userId,
      teamId: teamId
    });
  });

  // Handle new messages
  socket.on('new-message', async (data) => {
    try {
      const { teamId, message } = data;
      
      // Verify user is a member of the team
      const membership = await db.get(
        'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?',
        [teamId, socket.userId]
      );

      if (!membership) {
        socket.emit('error', { message: 'Access denied to team' });
        return;
      }

      // Broadcast message to team members
      io.to(`team-${teamId}`).emit('message-received', {
        ...message,
        teamId: teamId
      });

    } catch (error) {
      console.error('Error handling new message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Handle task updates
  socket.on('task-updated', async (data) => {
    try {
      const { teamId, task } = data;
      
      // Verify user is a member of the team
      const membership = await db.get(
        'SELECT * FROM team_members WHERE team_id = ? AND user_id = ?',
        [teamId, socket.userId]
      );

      if (!membership) {
        socket.emit('error', { message: 'Access denied to team' });
        return;
      }

      // Broadcast task update to team members
      socket.to(`team-${teamId}`).emit('task-update-received', {
        task: task,
        teamId: teamId,
        updatedBy: socket.userId
      });

    } catch (error) {
      console.error('Error handling task update:', error);
      socket.emit('error', { message: 'Failed to update task' });
    }
  });

  // Handle typing indicators
  socket.on('typing-start', (data) => {
    const { teamId } = data;
    socket.to(`team-${teamId}`).emit('user-typing', {
      userId: socket.userId,
      teamId: teamId
    });
  });

  socket.on('typing-stop', (data) => {
    const { teamId } = data;
    socket.to(`team-${teamId}`).emit('user-stopped-typing', {
      userId: socket.userId,
      teamId: teamId
    });
  });

  // Handle user status updates
  socket.on('status-update', (data) => {
    const { teamId, status } = data;
    socket.to(`team-${teamId}`).emit('user-status-changed', {
      userId: socket.userId,
      status: status,
      teamId: teamId
    });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`User ${socket.userId} disconnected`);
    
    // Notify all teams the user was in
    if (socket.currentTeam) {
      socket.to(`team-${socket.currentTeam}`).emit('user-left', {
        userId: socket.userId,
        teamId: socket.currentTeam
      });
    }
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error('Socket error:', error);
    socket.emit('error', { message: 'Connection error occurred' });
  });
};

module.exports = socketHandlers;
