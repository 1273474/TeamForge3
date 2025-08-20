import z from "zod";

// Team schemas
export const TeamSchema = z.object({
  id: z.number(),
  name: z.string(),
  invite_code: z.string(),
  created_by: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  role: z.string().optional(),
});

export const CreateTeamSchema = z.object({
  name: z.string().min(1, "Team name is required"),
});

export const JoinTeamSchema = z.object({
  invite_code: z.string().min(1, "Invite code is required"),
});

// Message schemas
export const MessageSchema = z.object({
  id: z.number(),
  team_id: z.number(),
  user_id: z.string().nullable(),
  content: z.string(),
  message_type: z.string().default('user'),
  mentioned_users: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const CreateMessageSchema = z.object({
  content: z.string().min(1, "Message content is required"),
  mentioned_users: z.array(z.string()).optional(),
});

// Task schemas
export const TaskSchema = z.object({
  id: z.number(),
  team_id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  status: z.string().default('todo'),
  assigned_to: z.string().nullable(),
  created_by: z.string(),
  priority: z.string().default('medium'),
  due_date: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const CreateTaskSchema = z.object({
  title: z.string().min(1, "Task title is required"),
  description: z.string().optional(),
  assigned_to: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  due_date: z.string().optional(),
});

export const UpdateTaskSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['todo', 'in_progress', 'done']).optional(),
  assigned_to: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  due_date: z.string().optional(),
});

// Type exports
export type Team = z.infer<typeof TeamSchema>;
export type CreateTeam = z.infer<typeof CreateTeamSchema>;
export type JoinTeam = z.infer<typeof JoinTeamSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type CreateMessage = z.infer<typeof CreateMessageSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type CreateTask = z.infer<typeof CreateTaskSchema>;
export type UpdateTask = z.infer<typeof UpdateTaskSchema>;
