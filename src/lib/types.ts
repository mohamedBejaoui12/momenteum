export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  timezone: string;
  created_at: string;
}

export interface Counter {
  id: string;
  user_id: string;
  name: string;
  icon: string | null;
  color: string;
  target_type: "daily" | "weekly";
  target_value: number;
  archived: boolean;
  created_at: string;
}

export interface CounterEntry {
  id: string;
  counter_id: string;
  user_id: string;
  entry_date: string; // ISO date string YYYY-MM-DD
  value: number;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  task_date: string;
  completed: boolean;
  completed_at: string | null;
  sort_order: number;
  created_at: string;
}

export interface Reminder {
  id: string;
  user_id: string;
  text: string;
  description: string | null;
  schedule_type: "daily" | "weekly"; // kept for backward compat
  recurrence: "once" | "daily" | "weekly";
  remind_at: string | null; // 'HH:MM' or null
  weekdays: number[] | null;
  active: boolean;
  next_occurrence: string | null; // ISO timestamptz
  created_at: string;
}
