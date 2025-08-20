import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  exchangeCodeForSessionToken,
  getOAuthRedirectUrl,
  authMiddleware,
  deleteSession,
  MOCHA_SESSION_TOKEN_COOKIE_NAME,
} from "@getmocha/users-service/backend";
import { getCookie, setCookie } from "hono/cookie";
import OpenAI from "openai";

const app = new Hono<{ Bindings: Env }>();

// CORS middleware
app.use("*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true
}));

// Auth endpoints
app.get('/api/oauth/google/redirect_url', async (c) => {
  const redirectUrl = await getOAuthRedirectUrl('google', {
    apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
    apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
  });

  return c.json({ redirectUrl }, 200);
});

app.post("/api/sessions", async (c) => {
  const body = await c.req.json();

  if (!body.code) {
    return c.json({ error: "No authorization code provided" }, 400);
  }

  const sessionToken = await exchangeCodeForSessionToken(body.code, {
    apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
    apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
  });

  setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: true,
    maxAge: 60 * 24 * 60 * 60, // 60 days
  });

  return c.json({ success: true }, 200);
});

app.get("/api/users/me", authMiddleware, async (c) => {
  return c.json(c.get("user"));
});

app.get('/api/logout', async (c) => {
  const sessionToken = getCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME);

  if (typeof sessionToken === 'string') {
    await deleteSession(sessionToken, {
      apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
      apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
    });
  }

  setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, '', {
    httpOnly: true,
    path: '/',
    sameSite: 'none',
    secure: true,
    maxAge: 0,
  });

  return c.json({ success: true }, 200);
});

// Teams endpoints
app.post("/api/teams", authMiddleware, async (c) => {
  const user = c.get("user")!;
  const { name } = await c.req.json();

  if (!name) {
    return c.json({ error: "Team name is required" }, 400);
  }

  // Generate a random invite code
  const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();

  try {
    const result = await c.env.DB.prepare(
      "INSERT INTO teams (name, invite_code, created_by) VALUES (?, ?, ?)"
    ).bind(name, inviteCode, user.id).run();

    const teamId = result.meta.last_row_id;

    // Add creator as team member
    await c.env.DB.prepare(
      "INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, 'admin')"
    ).bind(teamId, user.id).run();

    return c.json({ 
      id: teamId, 
      name, 
      invite_code: inviteCode, 
      created_by: user.id,
      role: 'admin'
    }, 201);
  } catch (error) {
    console.error("Error creating team:", error);
    return c.json({ error: "Failed to create team" }, 500);
  }
});

app.post("/api/teams/join", authMiddleware, async (c) => {
  const user = c.get("user")!;
  const { invite_code } = await c.req.json();

  if (!invite_code) {
    return c.json({ error: "Invite code is required" }, 400);
  }

  try {
    // Find team by invite code
    const team = await c.env.DB.prepare(
      "SELECT * FROM teams WHERE invite_code = ?"
    ).bind(invite_code).first();

    if (!team) {
      return c.json({ error: "Invalid invite code" }, 404);
    }

    // Check if user is already a member
    const existingMember = await c.env.DB.prepare(
      "SELECT * FROM team_members WHERE team_id = ? AND user_id = ?"
    ).bind(team.id, user.id).first();

    if (existingMember) {
      return c.json({ error: "You are already a member of this team" }, 400);
    }

    // Add user as team member
    await c.env.DB.prepare(
      "INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, 'member')"
    ).bind(team.id, user.id).run();

    return c.json({ 
      id: team.id, 
      name: team.name, 
      invite_code: team.invite_code,
      role: 'member'
    }, 200);
  } catch (error) {
    console.error("Error joining team:", error);
    return c.json({ error: "Failed to join team" }, 500);
  }
});

app.get("/api/teams", authMiddleware, async (c) => {
  const user = c.get("user")!;

  try {
    const { results } = await c.env.DB.prepare(`
      SELECT t.*, tm.role 
      FROM teams t 
      JOIN team_members tm ON t.id = tm.team_id 
      WHERE tm.user_id = ? 
      ORDER BY t.created_at DESC
    `).bind(user.id).all();

    return c.json(results);
  } catch (error) {
    console.error("Error fetching teams:", error);
    return c.json({ error: "Failed to fetch teams" }, 500);
  }
});

// Messages endpoints
app.get("/api/teams/:teamId/messages", authMiddleware, async (c) => {
  const user = c.get("user")!;
  const teamId = c.req.param("teamId");

  // Check if user is a member of the team
  const member = await c.env.DB.prepare(
    "SELECT * FROM team_members WHERE team_id = ? AND user_id = ?"
  ).bind(teamId, user.id).first();

  if (!member) {
    return c.json({ error: "Access denied" }, 403);
  }

  try {
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM messages 
      WHERE team_id = ? 
      ORDER BY created_at ASC 
      LIMIT 100
    `).bind(teamId).all();

    return c.json(results);
  } catch (error) {
    console.error("Error fetching messages:", error);
    return c.json({ error: "Failed to fetch messages" }, 500);
  }
});

app.post("/api/teams/:teamId/messages", authMiddleware, async (c) => {
  const user = c.get("user")!;
  const teamId = c.req.param("teamId");
  const { content, mentioned_users } = await c.req.json();

  // Check if user is a member of the team
  const member = await c.env.DB.prepare(
    "SELECT * FROM team_members WHERE team_id = ? AND user_id = ?"
  ).bind(teamId, user.id).first();

  if (!member) {
    return c.json({ error: "Access denied" }, 403);
  }

  if (!content) {
    return c.json({ error: "Message content is required" }, 400);
  }

  try {
    const result = await c.env.DB.prepare(
      "INSERT INTO messages (team_id, user_id, content, mentioned_users) VALUES (?, ?, ?, ?)"
    ).bind(teamId, user.id, content, mentioned_users ? JSON.stringify(mentioned_users) : null).run();

    const messageId = result.meta.last_row_id;

    // Handle different types of mentions and commands
    if (content.toLowerCase().includes('@ai')) {
      await handleAIMessage(c, teamId, content, user);
    } else if (content.toLowerCase().includes('remove task @')) {
      await handleTaskRemoval(c, teamId, content, user);
    } else if (content.includes('@') && !content.toLowerCase().startsWith('remove task')) {
      await handleTaskAssignment(c, teamId, content, user);
    }

    const message = await c.env.DB.prepare(
      "SELECT * FROM messages WHERE id = ?"
    ).bind(messageId).first();

    return c.json(message, 201);
  } catch (error) {
    console.error("Error creating message:", error);
    return c.json({ error: "Failed to create message" }, 500);
  }
});

// Tasks endpoints
app.get("/api/teams/:teamId/tasks", authMiddleware, async (c) => {
  const user = c.get("user")!;
  const teamId = c.req.param("teamId");

  // Check if user is a member of the team
  const member = await c.env.DB.prepare(
    "SELECT * FROM team_members WHERE team_id = ? AND user_id = ?"
  ).bind(teamId, user.id).first();

  if (!member) {
    return c.json({ error: "Access denied" }, 403);
  }

  try {
    const { results } = await c.env.DB.prepare(`
      SELECT * FROM tasks 
      WHERE team_id = ? 
      ORDER BY created_at DESC
    `).bind(teamId).all();

    return c.json(results);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return c.json({ error: "Failed to fetch tasks" }, 500);
  }
});

app.post("/api/teams/:teamId/tasks", authMiddleware, async (c) => {
  const user = c.get("user")!;
  const teamId = c.req.param("teamId");
  const { title, description, assigned_to, priority, due_date } = await c.req.json();

  // Check if user is a member of the team
  const member = await c.env.DB.prepare(
    "SELECT * FROM team_members WHERE team_id = ? AND user_id = ?"
  ).bind(teamId, user.id).first();

  if (!member) {
    return c.json({ error: "Access denied" }, 403);
  }

  if (!title) {
    return c.json({ error: "Task title is required" }, 400);
  }

  try {
    const result = await c.env.DB.prepare(
      "INSERT INTO tasks (team_id, title, description, assigned_to, created_by, priority, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind(teamId, title, description, assigned_to, user.id, priority || 'medium', due_date).run();

    const task = await c.env.DB.prepare(
      "SELECT * FROM tasks WHERE id = ?"
    ).bind(result.meta.last_row_id).first();

    return c.json(task, 201);
  } catch (error) {
    console.error("Error creating task:", error);
    return c.json({ error: "Failed to create task" }, 500);
  }
});

app.put("/api/teams/:teamId/tasks/:taskId", authMiddleware, async (c) => {
  const user = c.get("user")!;
  const teamId = c.req.param("teamId");
  const taskId = c.req.param("taskId");
  const updates = await c.req.json();

  // Check if user is a member of the team
  const member = await c.env.DB.prepare(
    "SELECT * FROM team_members WHERE team_id = ? AND user_id = ?"
  ).bind(teamId, user.id).first();

  if (!member) {
    return c.json({ error: "Access denied" }, 403);
  }

  try {
    const fields = [];
    const values = [];
    
    if (updates.title) {
      fields.push("title = ?");
      values.push(updates.title);
    }
    if (updates.description !== undefined) {
      fields.push("description = ?");
      values.push(updates.description);
    }
    if (updates.status) {
      fields.push("status = ?");
      values.push(updates.status);
    }
    if (updates.assigned_to !== undefined) {
      fields.push("assigned_to = ?");
      values.push(updates.assigned_to);
    }
    if (updates.priority) {
      fields.push("priority = ?");
      values.push(updates.priority);
    }
    if (updates.due_date !== undefined) {
      fields.push("due_date = ?");
      values.push(updates.due_date);
    }

    fields.push("updated_at = CURRENT_TIMESTAMP");
    values.push(taskId);

    await c.env.DB.prepare(
      `UPDATE tasks SET ${fields.join(", ")} WHERE id = ?`
    ).bind(...values).run();

    const task = await c.env.DB.prepare(
      "SELECT * FROM tasks WHERE id = ?"
    ).bind(taskId).first();

    return c.json(task);
  } catch (error) {
    console.error("Error updating task:", error);
    return c.json({ error: "Failed to update task" }, 500);
  }
});

// Utility function to clean task title (remove polite phrases)
function cleanTaskTitle(rawTitle: string): string {
  return rawTitle
    .replace(/^(please\s+|could\s+you\s+|can\s+you\s+)/i, '')
    .replace(/\s+(please|thanks?|thank\s+you)$/i, '')
    .trim();
}

// Utility function to extract due date from task description
function extractDueDate(description: string): { cleanDescription: string; dueDate: string | null } {
  const dueDatePatterns = [
    { pattern: /\s+by\s+tonight/i, getValue: () => {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      return today.toISOString().split('T')[0];
    }},
    { pattern: /\s+by\s+tomorrow/i, getValue: () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }},
    { pattern: /\s+by\s+(\d{4}-\d{2}-\d{2})/i, getValue: (match: RegExpMatchArray) => match[1] },
    { pattern: /\s+due\s+(\d{4}-\d{2}-\d{2})/i, getValue: (match: RegExpMatchArray) => match[1] }
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
}

// Utility function for exponential backoff retry
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on certain error types
      if (error.status === 401 || error.status === 403 || error.code === 'insufficient_quota') {
        throw error;
      }
      
      if (attempt === maxRetries) {
        break;
      }
      
      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

// Enhanced Task Assignment Handler
async function handleTaskAssignment(c: any, teamId: string, userMessage: string, assigner: any) {
  try {
    console.log("Processing task assignment:", userMessage);
    
    // Parse @username mentions and extract task details
    const mentionMatch = userMessage.match(/@(\w+)\s+(.+)/);
    if (!mentionMatch) {
      console.log("No mention match found in message:", userMessage);
      return;
    }

    const mentionedUsername = mentionMatch[1];
    const rawTaskDescription = mentionMatch[2].trim();

    console.log("Extracted task:", { mentionedUsername, rawTaskDescription });

    // Skip if this is just a regular mention without task intent
    if (rawTaskDescription.length < 3) {
      console.log("Task description too short, skipping");
      return;
    }

    // Clean the task title and extract due date
    const { cleanDescription, dueDate } = extractDueDate(rawTaskDescription);
    const cleanTitle = cleanTaskTitle(cleanDescription);

    console.log("Processed task:", { cleanTitle, dueDate });

    // Create the task
    const result = await c.env.DB.prepare(
      "INSERT INTO tasks (team_id, title, assigned_to, created_by, status, priority, due_date) VALUES (?, ?, ?, ?, 'todo', 'medium', ?)"
    ).bind(teamId, cleanTitle, mentionedUsername, assigner.id, dueDate).run();

    console.log("Task creation result:", result);

    if (result.success) {
      // Send confirmation message from system
      await c.env.DB.prepare(
        "INSERT INTO messages (team_id, user_id, content, message_type) VALUES (?, ?, ?, 'ai')"
      ).bind(teamId, null, `✅ Task assigned to @${mentionedUsername}: "${cleanTitle}"${dueDate ? `\n📅 Due: ${dueDate}` : ''}\n\nThis task has been added to the Kanban board under "To Do".`).run();
    } else {
      throw new Error("Database insert failed");
    }
  } catch (error) {
    console.error("Error handling task assignment:", error);
    await c.env.DB.prepare(
      "INSERT INTO messages (team_id, user_id, content, message_type) VALUES (?, ?, ?, 'ai')"
    ).bind(teamId, null, "❌ Sorry, I couldn't create that task. Please try again or check the task format.").run();
  }
}

// Enhanced Task Removal Handler
async function handleTaskRemoval(c: any, teamId: string, userMessage: string, _remover: any) {
  try {
    console.log("Processing task removal:", userMessage);
    
    // Parse "remove task @username task description"
    const removeMatch = userMessage.match(/remove task @(\w+)\s+(.+)/i);
    if (!removeMatch) {
      console.log("No remove task match found");
      return;
    }

    const mentionedUsername = removeMatch[1];
    const taskDescription = removeMatch[2].trim();

    console.log("Looking for task to remove:", { mentionedUsername, taskDescription });

    // Find the task using a more flexible search
    const { results: tasks } = await c.env.DB.prepare(
      "SELECT * FROM tasks WHERE team_id = ? AND assigned_to = ?"
    ).bind(teamId, mentionedUsername).all();

    console.log("Found tasks for user:", tasks.length);

    // Find the best matching task using improved matching
    let bestMatch = null;
    let bestScore = 0;

    for (const task of tasks) {
      const taskTitle = task.title.toLowerCase();
      const searchDesc = taskDescription.toLowerCase();
      
      // Calculate similarity score
      let score = 0;
      const searchWords = searchDesc.split(' ').filter(word => word.length > 2);
      const matchedWords = searchWords.filter(word => taskTitle.includes(word));
      
      // Score based on percentage of matched words and exact phrase matches
      score = matchedWords.length / searchWords.length;
      
      // Bonus for exact phrase matches
      if (taskTitle.includes(searchDesc) || searchDesc.includes(taskTitle)) {
        score += 0.5;
      }
      
      if (score > bestScore && score > 0.3) { // Minimum threshold
        bestScore = score;
        bestMatch = task;
      }
    }

    if (bestMatch) {
      console.log("Removing task:", bestMatch.title);
      
      await c.env.DB.prepare(
        "DELETE FROM tasks WHERE id = ?"
      ).bind(bestMatch.id).run();

      // Send confirmation message from system
      await c.env.DB.prepare(
        "INSERT INTO messages (team_id, user_id, content, message_type) VALUES (?, ?, ?, 'ai')"
      ).bind(teamId, null, `🗑️ Task removed from @${mentionedUsername}'s list: "${bestMatch.title}"\n\nThe task has been deleted from the Kanban board.`).run();
    } else {
      console.log("No matching task found");
      
      // Show available tasks for the user
      const taskList = tasks.length > 0 
        ? tasks.map((t: any) => `• ${t.title}`).join('\n')
        : 'No tasks found';
      
      await c.env.DB.prepare(
        "INSERT INTO messages (team_id, user_id, content, message_type) VALUES (?, ?, ?, 'ai')"
      ).bind(teamId, null, `❌ Couldn't find a matching task for @${mentionedUsername}.\n\n**Current tasks:**\n${taskList}\n\nTry being more specific with the task description.`).run();
    }
  } catch (error) {
    console.error("Error handling task removal:", error);
    await c.env.DB.prepare(
      "INSERT INTO messages (team_id, user_id, content, message_type) VALUES (?, ?, ?, 'ai')"
    ).bind(teamId, null, "❌ Sorry, I couldn't remove that task. Please try again.").run();
  }
}

// Enhanced AI Message Handler with Retry Logic
async function handleAIMessage(c: any, teamId: string, userMessage: string, _user: any) {
  try {
    if (!c.env.OPENAI_API_KEY) {
      console.error("OpenAI API key not configured");
      await c.env.DB.prepare(
        "INSERT INTO messages (team_id, user_id, content, message_type) VALUES (?, ?, ?, 'ai')"
      ).bind(teamId, null, "🤖 AI assistant is not configured. Please contact your administrator.").run();
      return;
    }

    const openai = new OpenAI({
      apiKey: c.env.OPENAI_API_KEY,
    });

    let aiResponse = "";

    if (userMessage.toLowerCase().includes("summarize")) {
      // Get last 20 messages for summarization
      const { results: recentMessages } = await c.env.DB.prepare(`
        SELECT content, user_id, created_at FROM messages 
        WHERE team_id = ? AND message_type = 'user'
        ORDER BY created_at DESC 
        LIMIT 20
      `).bind(teamId).all();

      if (recentMessages.length === 0) {
        aiResponse = "📋 There are no recent messages to summarize yet.";
      } else {
        const messageHistory = recentMessages.reverse().map((msg: any) => 
          `User ${msg.user_id?.slice(-6)}: ${msg.content}`
        ).join('\n');

        // Use retry logic for OpenAI API call
        const completion = await retryWithBackoff(async () => {
          return await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'You are a helpful AI assistant for a developer team collaboration tool. Provide concise summaries of team conversations.'
              },
              {
                role: 'user',
                content: `Please summarize the following team conversation:\n\n${messageHistory}`
              }
            ],
            max_tokens: 300,
            temperature: 0.7
          });
        });

        aiResponse = completion.choices[0].message.content || "Sorry, I couldn't generate a summary.";
      }
    } else {
      // General AI response with model fallback
      const models = ['gpt-4o', 'gpt-4o-mini'];
      
      for (const model of models) {
        try {
          const completion = await retryWithBackoff(async () => {
            return await openai.chat.completions.create({
              model: model,
              messages: [
                {
                  role: 'system',
                  content: 'You are a helpful AI assistant for a developer team collaboration tool called TeamForge. Help with coding questions, suggest GitHub repositories, provide code snippets, and assist with project management. Be concise and practical.'
                },
                {
                  role: 'user',
                  content: userMessage.replace('@ai', '').trim()
                }
              ],
              max_tokens: 500,
              temperature: 0.7
            });
          });

          aiResponse = completion.choices[0].message.content || "Sorry, I couldn't process your request.";
          break;
        } catch (error: any) {
          console.error(`Error with model ${model}:`, error);
          if (model === models[models.length - 1]) {
            throw error; // Re-throw if last model also failed
          }
        }
      }
    }

    // Save AI response as a message
    await c.env.DB.prepare(
      "INSERT INTO messages (team_id, user_id, content, message_type) VALUES (?, ?, ?, 'ai')"
    ).bind(teamId, null, aiResponse).run();

  } catch (error: any) {
    console.error("Error handling AI message:", error);
    
    let errorMessage = "AI is currently busy, please try again in a few seconds.";
    
    // Handle specific OpenAI errors
    if (error.status === 429) {
      errorMessage = "🚫 AI is currently experiencing high demand. Please try again in a few seconds.";
    } else if (error.status === 401) {
      errorMessage = "🔑 OpenAI API key is invalid. Please contact your administrator.";
    } else if (error.code === 'insufficient_quota') {
      errorMessage = "💳 OpenAI quota exceeded. Please contact your administrator to upgrade the plan.";
    } else if (error.message?.includes('model')) {
      errorMessage = "🤖 AI model temporarily unavailable. Please try again in a few seconds.";
    } else if (error.message?.includes('timeout')) {
      errorMessage = "⏱️ AI response timed out. Please try again with a shorter message.";
    }
    
    // Save error message
    await c.env.DB.prepare(
      "INSERT INTO messages (team_id, user_id, content, message_type) VALUES (?, ?, ?, 'ai')"
    ).bind(teamId, null, errorMessage).run();
  }
}

export default app;
