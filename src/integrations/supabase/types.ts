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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      items: {
        Row: {
          collectible_condition: string | null
          collectible_manufacturer: string | null
          collectible_notes: string | null
          collectible_origin: string | null
          collectible_scale: string | null
          collectible_series: string | null
          collectible_year: string | null
          created_at: string
          historical_fact: string | null
          id: string
          index_breakdown: Json | null
          music_suggestion: string | null
          price_index: number | null
          rarity_tier: string | null
          real_car_brand: string
          real_car_model: string
          real_car_photos: Json | null
          real_car_year: string | null
        }
        Insert: {
          collectible_condition?: string | null
          collectible_manufacturer?: string | null
          collectible_notes?: string | null
          collectible_origin?: string | null
          collectible_scale?: string | null
          collectible_series?: string | null
          collectible_year?: string | null
          created_at?: string
          historical_fact?: string | null
          id?: string
          index_breakdown?: Json | null
          music_suggestion?: string | null
          price_index?: number | null
          rarity_tier?: string | null
          real_car_brand: string
          real_car_model: string
          real_car_photos?: Json | null
          real_car_year?: string | null
        }
        Update: {
          collectible_condition?: string | null
          collectible_manufacturer?: string | null
          collectible_notes?: string | null
          collectible_origin?: string | null
          collectible_scale?: string | null
          collectible_series?: string | null
          collectible_year?: string | null
          created_at?: string
          historical_fact?: string | null
          id?: string
          index_breakdown?: Json | null
          music_suggestion?: string | null
          price_index?: number | null
          rarity_tier?: string | null
          real_car_brand?: string
          real_car_model?: string
          real_car_photos?: Json | null
          real_car_year?: string | null
        }
        Relationships: []
      }
      listings: {
        Row: {
          created_at: string
          currency: string
          description: string | null
          external_url: string | null
          id: string
          image_url: string
          item_id: string | null
          price: number
          source: string
          source_country: string
          source_name: string
          status: string
          title: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          currency?: string
          description?: string | null
          external_url?: string | null
          id?: string
          image_url: string
          item_id?: string | null
          price: number
          source: string
          source_country?: string
          source_name: string
          status?: string
          title: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string | null
          external_url?: string | null
          id?: string
          image_url?: string
          item_id?: string | null
          price?: number
          source?: string
          source_country?: string
          source_name?: string
          status?: string
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listings_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_sources: {
        Row: {
          category: string
          code: string
          country: string
          created_at: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          scrape_config: Json | null
          url: string
        }
        Insert: {
          category: string
          code: string
          country: string
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          scrape_config?: Json | null
          url: string
        }
        Update: {
          category?: string
          code?: string
          country?: string
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          scrape_config?: Json | null
          url?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          caption: string | null
          collection_item_id: string | null
          comments_count: number
          created_at: string
          id: string
          image_url: string
          likes_count: number
          user_id: string
        }
        Insert: {
          caption?: string | null
          collection_item_id?: string | null
          comments_count?: number
          created_at?: string
          id?: string
          image_url: string
          likes_count?: number
          user_id: string
        }
        Update: {
          caption?: string | null
          collection_item_id?: string | null
          comments_count?: number
          created_at?: string
          id?: string
          image_url?: string
          likes_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_collection_item_id_fkey"
            columns: ["collection_item_id"]
            isOneToOne: false
            referencedRelation: "user_collection"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          id: string
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      user_collection: {
        Row: {
          acquired_at: string | null
          created_at: string
          id: string
          image_url: string | null
          item_id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          acquired_at?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          item_id: string
          notes?: string | null
          user_id: string
        }
        Update: {
          acquired_at?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          item_id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_collection_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      user_subscriptions: {
        Row: {
          created_at: string
          id: string
          status: string
          stripe_customer_id: string | null
          subscription_id: string | null
          trial_ends_at: string
          trial_started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          stripe_customer_id?: string | null
          subscription_id?: string | null
          trial_ends_at?: string
          trial_started_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          stripe_customer_id?: string | null
          subscription_id?: string | null
          trial_ends_at?: string
          trial_started_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
