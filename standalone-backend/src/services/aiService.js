const OpenAI = require('openai');
const db = require('../database/connection');

class AIService {
  constructor() {
    this.openai = process.env.OPENAI_API_KEY ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    }) : null;
  }

  async handleAIMessage(teamId, userMessage, user) {
    if (!this.openai) {
      await this.sendSystemMessage(teamId, "🤖 AI assistant is not configured. Please contact your administrator.");
      return;
    }

    try {
      let aiResponse = "";

      if (userMessage.toLowerCase().includes("summarize")) {
        aiResponse = await this.summarizeConversation(teamId);
      } else {
        aiResponse = await this.getAIResponse(userMessage);
      }

      // Save AI response as a message
      await db.run(
        'INSERT INTO messages (team_id, user_id, content, message_type) VALUES (?, ?, ?, ?)',
        [teamId, null, aiResponse, 'ai']
      );

    } catch (error) {
      console.error("AI service error:", error);
      await this.handleAIError(teamId, error);
    }
  }

  async summarizeConversation(teamId) {
    try {
      // Get last 20 messages for summarization
      const recentMessages = await db.all(`
        SELECT content, user_id, created_at, u.name as user_name
        FROM messages m
        LEFT JOIN users u ON m.user_id = u.id
        WHERE m.team_id = ? AND m.message_type = 'user'
        ORDER BY m.created_at DESC 
        LIMIT 20
      `, [teamId]);

      if (recentMessages.length === 0) {
        return "📋 There are no recent messages to summarize yet.";
      }

      const messageHistory = recentMessages.reverse().map(msg => 
        `${msg.user_name || `User ${msg.user_id?.slice(-6)}`}: ${msg.content}`
      ).join('\n');

      const completion = await this.retryOpenAICall(async () => {
        return await this.openai.chat.completions.create({
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

      return completion.choices[0].message.content || "Sorry, I couldn't generate a summary.";
    } catch (error) {
      console.error("Error in summarizeConversation:", error);
      throw error;
    }
  }

  async getAIResponse(userMessage) {
    const models = ['gpt-4o', 'gpt-4o-mini'];
    
    for (const model of models) {
      try {
        const completion = await this.retryOpenAICall(async () => {
          return await this.openai.chat.completions.create({
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

        return completion.choices[0].message.content || "Sorry, I couldn't process your request.";
      } catch (error) {
        console.error(`Error with model ${model}:`, error);
        if (model === models[models.length - 1]) {
          throw error; // Re-throw if last model also failed
        }
      }
    }
  }

  async retryOpenAICall(operation, maxRetries = 3, baseDelay = 1000) {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
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

  async handleAIError(teamId, error) {
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
    
    await this.sendSystemMessage(teamId, errorMessage);
  }

  async sendSystemMessage(teamId, content) {
    await db.run(
      'INSERT INTO messages (team_id, user_id, content, message_type) VALUES (?, ?, ?, ?)',
      [teamId, null, content, 'ai']
    );
  }
}

module.exports = new AIService();
