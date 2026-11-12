export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      artists: {
        Row: {
          created_at: string
          id: string
          name: string
          spotify_url: string | null
          updated_at: string
          user_id: string
          youtube_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          spotify_url?: string | null
          updated_at?: string
          user_id?: string
          youtube_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          spotify_url?: string | null
          updated_at?: string
          user_id?: string
          youtube_url?: string | null
        }
        Relationships: []
      }
      calendars: {
        Row: {
          caldav_url: string
          color: string | null
          created_at: string
          id: string
          is_default: boolean
          name: string
          updated_at: string
          user_id: string
          visible: boolean
        }
        Insert: {
          caldav_url: string
          color?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          updated_at?: string
          user_id?: string
          visible?: boolean
        }
        Update: {
          caldav_url?: string
          color?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          updated_at?: string
          user_id?: string
          visible?: boolean
        }
        Relationships: []
      }
      deadlines: {
        Row: {
          created_at: string
          done: boolean
          due_at: string
          id: string
          kind: string
          subject_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          done?: boolean
          due_at: string
          id?: string
          kind?: string
          subject_id?: string | null
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          done?: boolean
          due_at?: string
          id?: string
          kind?: string
          subject_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deadlines_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      english_attempts: {
        Row: {
          answer: string | null
          correct: boolean | null
          created_at: string
          exercise_id: string | null
          feedback: string | null
          id: string
          rule: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          answer?: string | null
          correct?: boolean | null
          created_at?: string
          exercise_id?: string | null
          feedback?: string | null
          id?: string
          rule?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          answer?: string | null
          correct?: boolean | null
          created_at?: string
          exercise_id?: string | null
          feedback?: string | null
          id?: string
          rule?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "english_attempts_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "english_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      english_daily: {
        Row: {
          created_at: string
          date: string
          id: string
          points: number
          streak: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          points?: number
          streak?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          points?: number
          streak?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      english_exercises: {
        Row: {
          created_at: string
          id: string
          payload: Json
          section: string
          solution: Json | null
          topic: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload: Json
          section: string
          solution?: Json | null
          topic?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          section?: string
          solution?: Json | null
          topic?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      english_profile: {
        Row: {
          answers: Json
          created_at: string
          id: string
          level: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          id?: string
          level?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          answers?: Json
          created_at?: string
          id?: string
          level?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          all_day: boolean
          calendar_id: string
          created_at: string
          deleted: boolean
          ends_at: string | null
          etag: string | null
          exdates: string[]
          rrule: string | null
          href: string | null
          id: string
          location: string | null
          notes: string | null
          raw_ics: string | null
          starts_at: string
          title: string
          uid: string
          updated_at: string
          user_id: string
        }
        Insert: {
          all_day?: boolean
          calendar_id: string
          created_at?: string
          deleted?: boolean
          ends_at?: string | null
          etag?: string | null
          exdates?: string[]
          rrule?: string | null
          href?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          raw_ics?: string | null
          starts_at: string
          title?: string
          uid: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          all_day?: boolean
          calendar_id?: string
          created_at?: string
          deleted?: boolean
          ends_at?: string | null
          etag?: string | null
          exdates?: string[]
          rrule?: string | null
          href?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          raw_ics?: string | null
          starts_at?: string
          title?: string
          uid?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          aliases: string[]
          archived: boolean
          created_at: string
          id: string
          met: number | null
          muscle_group: string | null
          name: string
          type: string
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          aliases?: string[]
          archived?: boolean
          created_at?: string
          id?: string
          met?: number | null
          muscle_group?: string | null
          name: string
          type: string
          unit: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          aliases?: string[]
          archived?: boolean
          created_at?: string
          id?: string
          met?: number | null
          muscle_group?: string | null
          name?: string
          type?: string
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      expense_categories: {
        Row: {
          created_at: string
          id: string
          monthly_budget: number | null
          name: string
          position: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          monthly_budget?: number | null
          name: string
          position?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          monthly_budget?: number | null
          name?: string
          position?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          date: string
          id: string
          note: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          date?: string
          id?: string
          note?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          date?: string
          id?: string
          note?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      foods: {
        Row: {
          carbs: number
          created_at: string
          fat: number
          fiber: number
          id: string
          kcal: number
          name: string
          protein: number
          updated_at: string
          user_id: string
        }
        Insert: {
          carbs?: number
          created_at?: string
          fat?: number
          fiber?: number
          id?: string
          kcal?: number
          name: string
          protein?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          carbs?: number
          created_at?: string
          fat?: number
          fiber?: number
          id?: string
          kcal?: number
          name?: string
          protein?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      meal_items: {
        Row: {
          created_at: string
          food_id: string | null
          grams: number
          id: string
          meal_id: string
          position: number
          recipe_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          food_id?: string | null
          grams: number
          id?: string
          meal_id: string
          position?: number
          recipe_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          food_id?: string | null
          grams?: number
          id?: string
          meal_id?: string
          position?: number
          recipe_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_items_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_items_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "meals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_items_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      meals: {
        Row: {
          created_at: string
          date: string
          id: string
          slot: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          slot: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          slot?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          body: string
          created_at: string
          id: string
          pinned: boolean
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          pinned?: boolean
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          pinned?: boolean
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recipe_items: {
        Row: {
          created_at: string
          food_id: string
          grams: number
          id: string
          position: number
          recipe_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          food_id: string
          grams: number
          id?: string
          position?: number
          recipe_id: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          food_id?: string
          grams?: number
          id?: string
          position?: number
          recipe_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_items_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_items_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          created_at: string
          id: string
          name: string
          notes: string | null
          photo_path: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          photo_path?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          photo_path?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sets: {
        Row: {
          calories: number | null
          created_at: string
          done: boolean
          id: string
          item_id: string
          meters: number | null
          position: number
          reps: number | null
          seconds: number | null
          updated_at: string
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          calories?: number | null
          created_at?: string
          done?: boolean
          id?: string
          item_id: string
          meters?: number | null
          position?: number
          reps?: number | null
          seconds?: number | null
          updated_at?: string
          user_id?: string
          weight_kg?: number | null
        }
        Update: {
          calories?: number | null
          created_at?: string
          done?: boolean
          id?: string
          item_id?: string
          meters?: number | null
          position?: number
          reps?: number | null
          seconds?: number | null
          updated_at?: string
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sets_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "workout_items"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          created_at: string
          data: Json
          id: string
          section: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          section: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          section?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      songs: {
        Row: {
          artist: string
          created_at: string
          id: string
          lesson: Json | null
          lyrics: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          artist: string
          created_at?: string
          id?: string
          lesson?: Json | null
          lyrics?: string | null
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          artist?: string
          created_at?: string
          id?: string
          lesson?: Json | null
          lyrics?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subjects: {
        Row: {
          color: string | null
          course: number | null
          created_at: string
          ects: number | null
          grade: number | null
          id: string
          name: string
          term: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          course?: number | null
          created_at?: string
          ects?: number | null
          grade?: number | null
          id?: string
          name: string
          term?: number | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          color?: string | null
          course?: number | null
          created_at?: string
          ects?: number | null
          grade?: number | null
          id?: string
          name?: string
          term?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sync_state: {
        Row: {
          calendar_id: string | null
          created_at: string
          ctag: string | null
          id: string
          last_error: string | null
          last_synced_at: string | null
          sync_token: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          calendar_id?: string | null
          created_at?: string
          ctag?: string | null
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          sync_token?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          calendar_id?: string | null
          created_at?: string
          ctag?: string | null
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          sync_token?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_state_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
        ]
      }
      tfg_milestones: {
        Row: {
          created_at: string
          due_at: string | null
          id: string
          position: number
          progress: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          due_at?: string | null
          id?: string
          position?: number
          progress?: number
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          due_at?: string | null
          id?: string
          position?: number
          progress?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vocab_cards: {
        Row: {
          box: number
          created_at: string
          due_on: string
          example: string | null
          id: string
          source: string
          term: string
          translation: string
          updated_at: string
          user_id: string
        }
        Insert: {
          box?: number
          created_at?: string
          due_on?: string
          example?: string | null
          id?: string
          source?: string
          term: string
          translation: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          box?: number
          created_at?: string
          due_on?: string
          example?: string | null
          id?: string
          source?: string
          term?: string
          translation?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      watchlist: {
        Row: {
          created_at: string
          id: string
          kind: string
          notes: string | null
          platform: string | null
          progress: string | null
          rating: number | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          notes?: string | null
          platform?: string | null
          progress?: string | null
          rating?: number | null
          status?: string
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          notes?: string | null
          platform?: string | null
          progress?: string | null
          rating?: number | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workout_items: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          notes: string | null
          position: number
          updated_at: string
          user_id: string
          workout_id: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          notes?: string | null
          position?: number
          updated_at?: string
          user_id?: string
          workout_id: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          notes?: string | null
          position?: number
          updated_at?: string
          user_id?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_items_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_items_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          created_at: string
          date: string
          duration_min: number | null
          id: string
          kind: string
          met_kcal: number | null
          notes: string | null
          result: Json | null
          started_at: string | null
          updated_at: string
          user_id: string
          watch_kcal: number | null
        }
        Insert: {
          created_at?: string
          date?: string
          duration_min?: number | null
          id?: string
          kind?: string
          met_kcal?: number | null
          notes?: string | null
          result?: Json | null
          started_at?: string | null
          updated_at?: string
          user_id?: string
          watch_kcal?: number | null
        }
        Update: {
          created_at?: string
          date?: string
          duration_min?: number | null
          id?: string
          kind?: string
          met_kcal?: number | null
          notes?: string | null
          result?: Json | null
          started_at?: string | null
          updated_at?: string
          user_id?: string
          watch_kcal?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      keepalive: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
