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
      ai_usage_logs: {
        Row: {
          cost_estimate_usd: number
          created_at: string
          function_name: string
          id: string
          input_tokens: number
          metadata: Json | null
          model: string
          output_tokens: number
          total_tokens: number | null
          user_id: string | null
        }
        Insert: {
          cost_estimate_usd?: number
          created_at?: string
          function_name: string
          id?: string
          input_tokens?: number
          metadata?: Json | null
          model: string
          output_tokens?: number
          total_tokens?: number | null
          user_id?: string | null
        }
        Update: {
          cost_estimate_usd?: number
          created_at?: string
          function_name?: string
          id?: string
          input_tokens?: number
          metadata?: Json | null
          model?: string
          output_tokens?: number
          total_tokens?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string
          device_type: string | null
          duration_ms: number | null
          event_type: string
          id: string
          interaction_target: string | null
          interaction_type: string | null
          metadata: Json | null
          page_path: string
          page_title: string | null
          session_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          device_type?: string | null
          duration_ms?: number | null
          event_type: string
          id?: string
          interaction_target?: string | null
          interaction_type?: string | null
          metadata?: Json | null
          page_path: string
          page_title?: string | null
          session_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          device_type?: string | null
          duration_ms?: number | null
          event_type?: string
          id?: string
          interaction_target?: string | null
          interaction_type?: string | null
          metadata?: Json | null
          page_path?: string
          page_title?: string | null
          session_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          quantity: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          quantity?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          quantity?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
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
          collectible_color: string | null
          collectible_condition: string | null
          collectible_manufacturer: string | null
          collectible_notes: string | null
          collectible_origin: string | null
          collectible_scale: string | null
          collectible_series: string | null
          collectible_year: string | null
          created_at: string
          estimated_value_max: number | null
          estimated_value_min: number | null
          historical_fact: string | null
          id: string
          index_breakdown: Json | null
          music_selection_reason: string | null
          music_suggestion: string | null
          price_index: number | null
          rarity_tier: string | null
          real_car_brand: string
          real_car_model: string
          real_car_photos: Json | null
          real_car_year: string | null
        }
        Insert: {
          collectible_color?: string | null
          collectible_condition?: string | null
          collectible_manufacturer?: string | null
          collectible_notes?: string | null
          collectible_origin?: string | null
          collectible_scale?: string | null
          collectible_series?: string | null
          collectible_year?: string | null
          created_at?: string
          estimated_value_max?: number | null
          estimated_value_min?: number | null
          historical_fact?: string | null
          id?: string
          index_breakdown?: Json | null
          music_selection_reason?: string | null
          music_suggestion?: string | null
          price_index?: number | null
          rarity_tier?: string | null
          real_car_brand: string
          real_car_model: string
          real_car_photos?: Json | null
          real_car_year?: string | null
        }
        Update: {
          collectible_color?: string | null
          collectible_condition?: string | null
          collectible_manufacturer?: string | null
          collectible_notes?: string | null
          collectible_origin?: string | null
          collectible_scale?: string | null
          collectible_series?: string | null
          collectible_year?: string | null
          created_at?: string
          estimated_value_max?: number | null
          estimated_value_min?: number | null
          historical_fact?: string | null
          id?: string
          index_breakdown?: Json | null
          music_selection_reason?: string | null
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
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ml_ab_results: {
        Row: {
          created_at: string
          error_field: string | null
          id: string
          item_id: string | null
          model_used: string | null
          response_time_ms: number | null
          user_id: string | null
          variant_id: string | null
          was_successful: boolean | null
        }
        Insert: {
          created_at?: string
          error_field?: string | null
          id?: string
          item_id?: string | null
          model_used?: string | null
          response_time_ms?: number | null
          user_id?: string | null
          variant_id?: string | null
          was_successful?: boolean | null
        }
        Update: {
          created_at?: string
          error_field?: string | null
          id?: string
          item_id?: string | null
          model_used?: string | null
          response_time_ms?: number | null
          user_id?: string | null
          variant_id?: string | null
          was_successful?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "ml_ab_results_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "ml_prompt_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      ml_corrections: {
        Row: {
          confidence_boost: number | null
          corrected_brand: string | null
          corrected_field: string
          corrected_manufacturer: string | null
          corrected_model: string | null
          corrected_scale: string | null
          corrected_year: string | null
          created_at: string
          id: string
          is_validated: boolean | null
          original_brand: string | null
          original_manufacturer: string | null
          original_model: string | null
          original_scale: string | null
          original_year: string | null
          times_used: number | null
          validation_count: number | null
          visual_cues: string | null
        }
        Insert: {
          confidence_boost?: number | null
          corrected_brand?: string | null
          corrected_field: string
          corrected_manufacturer?: string | null
          corrected_model?: string | null
          corrected_scale?: string | null
          corrected_year?: string | null
          created_at?: string
          id?: string
          is_validated?: boolean | null
          original_brand?: string | null
          original_manufacturer?: string | null
          original_model?: string | null
          original_scale?: string | null
          original_year?: string | null
          times_used?: number | null
          validation_count?: number | null
          visual_cues?: string | null
        }
        Update: {
          confidence_boost?: number | null
          corrected_brand?: string | null
          corrected_field?: string
          corrected_manufacturer?: string | null
          corrected_model?: string | null
          corrected_scale?: string | null
          corrected_year?: string | null
          created_at?: string
          id?: string
          is_validated?: boolean | null
          original_brand?: string | null
          original_manufacturer?: string | null
          original_model?: string | null
          original_scale?: string | null
          original_year?: string | null
          times_used?: number | null
          validation_count?: number | null
          visual_cues?: string | null
        }
        Relationships: []
      }
      ml_learned_patterns: {
        Row: {
          correction_prompt: string
          created_at: string
          effectiveness_score: number | null
          examples: Json | null
          id: string
          last_occurrence: string | null
          occurrence_count: number | null
          pattern_type: string
          trigger_condition: string
          updated_at: string
        }
        Insert: {
          correction_prompt: string
          created_at?: string
          effectiveness_score?: number | null
          examples?: Json | null
          id?: string
          last_occurrence?: string | null
          occurrence_count?: number | null
          pattern_type: string
          trigger_condition: string
          updated_at?: string
        }
        Update: {
          correction_prompt?: string
          created_at?: string
          effectiveness_score?: number | null
          examples?: Json | null
          id?: string
          last_occurrence?: string | null
          occurrence_count?: number | null
          pattern_type?: string
          trigger_condition?: string
          updated_at?: string
        }
        Relationships: []
      }
      ml_prompt_variants: {
        Row: {
          accuracy_rate: number | null
          created_at: string
          description: string | null
          error_reports: number | null
          id: string
          is_active: boolean | null
          is_control: boolean | null
          name: string
          prompt_snippet: string
          successful_identifications: number | null
          target_field: string | null
          total_uses: number | null
        }
        Insert: {
          accuracy_rate?: number | null
          created_at?: string
          description?: string | null
          error_reports?: number | null
          id?: string
          is_active?: boolean | null
          is_control?: boolean | null
          name: string
          prompt_snippet: string
          successful_identifications?: number | null
          target_field?: string | null
          total_uses?: number | null
        }
        Update: {
          accuracy_rate?: number | null
          created_at?: string
          description?: string | null
          error_reports?: number | null
          id?: string
          is_active?: boolean | null
          is_control?: boolean | null
          name?: string
          prompt_snippet?: string
          successful_identifications?: number | null
          target_field?: string | null
          total_uses?: number | null
        }
        Relationships: []
      }
      news_articles: {
        Row: {
          category: string
          content: string | null
          fetched_at: string | null
          id: string
          image_url: string | null
          is_featured: boolean | null
          is_launch: boolean | null
          language: string | null
          published_at: string | null
          source_logo: string | null
          source_name: string
          source_url: string
          subcategory: string | null
          summary: string | null
          tags: string[] | null
          title: string
          view_count: number | null
        }
        Insert: {
          category: string
          content?: string | null
          fetched_at?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          is_launch?: boolean | null
          language?: string | null
          published_at?: string | null
          source_logo?: string | null
          source_name: string
          source_url: string
          subcategory?: string | null
          summary?: string | null
          tags?: string[] | null
          title: string
          view_count?: number | null
        }
        Update: {
          category?: string
          content?: string | null
          fetched_at?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          is_launch?: boolean | null
          language?: string | null
          published_at?: string | null
          source_logo?: string | null
          source_name?: string
          source_url?: string
          subcategory?: string | null
          summary?: string | null
          tags?: string[] | null
          title?: string
          view_count?: number | null
        }
        Relationships: []
      }
      news_sources: {
        Row: {
          category: string
          code: string
          created_at: string | null
          fetch_method: string | null
          id: string
          is_active: boolean | null
          language: string | null
          last_fetched_at: string | null
          logo_url: string | null
          name: string
          rss_url: string | null
          url: string
        }
        Insert: {
          category: string
          code: string
          created_at?: string | null
          fetch_method?: string | null
          id?: string
          is_active?: boolean | null
          language?: string | null
          last_fetched_at?: string | null
          logo_url?: string | null
          name: string
          rss_url?: string | null
          url: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string | null
          fetch_method?: string | null
          id?: string
          is_active?: boolean | null
          language?: string | null
          last_fetched_at?: string | null
          logo_url?: string | null
          name?: string
          rss_url?: string | null
          url?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_id: string
          created_at: string
          id: string
          is_read: boolean
          message: string | null
          post_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          post_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          post_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          likes_count: number
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          likes_count?: number
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          likes_count?: number
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
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
      price_estimates: {
        Row: {
          created_at: string
          currency: string
          id: string
          item_id: string
          notes: string | null
          price_brl: number | null
          price_max_brl: number | null
          price_min_brl: number | null
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          item_id: string
          notes?: string | null
          price_brl?: number | null
          price_max_brl?: number | null
          price_min_brl?: number | null
          source?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          item_id?: string
          notes?: string | null
          price_brl?: number | null
          price_max_brl?: number | null
          price_min_brl?: number | null
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_estimates_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          created_at: string
          id: string
          phone: string | null
          show_collection_value: boolean
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          id?: string
          phone?: string | null
          show_collection_value?: boolean
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          id?: string
          phone?: string | null
          show_collection_value?: boolean
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          topics: string[] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          topics?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          topics?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      scan_feedback: {
        Row: {
          created_at: string
          error_correction: string | null
          error_field: string | null
          feedback_type: string
          id: string
          item_id: string | null
          original_value: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_correction?: string | null
          error_field?: string | null
          feedback_type: string
          id?: string
          item_id?: string | null
          original_value?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_correction?: string | null
          error_field?: string | null
          feedback_type?: string
          id?: string
          item_id?: string | null
          original_value?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scan_feedback_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      scanner_error_logs: {
        Row: {
          created_at: string
          error_message: string | null
          error_type: string
          function_name: string
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          error_type: string
          function_name: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          error_type?: string
          function_name?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_collection: {
        Row: {
          acquired_at: string | null
          created_at: string
          id: string
          image_url: string | null
          is_pinned: boolean
          item_id: string
          notes: string | null
          pinned_at: string | null
          user_id: string
        }
        Insert: {
          acquired_at?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_pinned?: boolean
          item_id: string
          notes?: string | null
          pinned_at?: string | null
          user_id: string
        }
        Update: {
          acquired_at?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_pinned?: boolean
          item_id?: string
          notes?: string | null
          pinned_at?: string | null
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
      user_news_preferences: {
        Row: {
          categories: string[] | null
          created_at: string | null
          id: string
          language: string | null
          notifications_enabled: boolean | null
          push_enabled: boolean | null
          sources: string[] | null
          subcategories: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          categories?: string[] | null
          created_at?: string | null
          id?: string
          language?: string | null
          notifications_enabled?: boolean | null
          push_enabled?: boolean | null
          sources?: string[] | null
          subcategories?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          categories?: string[] | null
          created_at?: string | null
          id?: string
          language?: string | null
          notifications_enabled?: boolean | null
          push_enabled?: boolean | null
          sources?: string[] | null
          subcategories?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          challenge_completed_at: string | null
          challenge_rewarded: boolean | null
          challenge_target: number | null
          created_at: string
          discount_applied: boolean | null
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
          challenge_completed_at?: string | null
          challenge_rewarded?: boolean | null
          challenge_target?: number | null
          created_at?: string
          discount_applied?: boolean | null
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
          challenge_completed_at?: string | null
          challenge_rewarded?: boolean | null
          challenge_target?: number | null
          created_at?: string
          discount_applied?: boolean | null
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
      check_email_exists: { Args: { p_email: string }; Returns: Json }
      find_or_create_conversation: {
        Args: { other_user_id: string }
        Returns: string
      }
      get_active_patterns: {
        Args: { p_limit?: number }
        Returns: {
          correction_prompt: string
          effectiveness_score: number
          pattern_type: string
          trigger_condition: string
        }[]
      }
      get_admin_ai_usage_stats: { Args: { days_back?: number }; Returns: Json }
      get_admin_page_analytics: { Args: { days_back?: number }; Returns: Json }
      get_admin_scanner_performance: {
        Args: { days_back?: number }
        Returns: Json
      }
      get_admin_stats: { Args: never; Returns: Json }
      get_admin_subscription_stats: { Args: never; Returns: Json }
      get_admin_user_growth: { Args: never; Returns: Json }
      get_admin_users: { Args: never; Returns: Json }
      get_relevant_corrections: {
        Args: { p_brand?: string; p_limit?: number; p_manufacturer?: string }
        Returns: {
          confidence_boost: number
          corrected_brand: string
          corrected_manufacturer: string
          corrected_model: string
          original_brand: string
          original_manufacturer: string
          original_model: string
          visual_cues: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      record_ab_result: {
        Args: {
          p_error_field?: string
          p_item_id?: string
          p_model_used?: string
          p_response_time_ms?: number
          p_user_id?: string
          p_variant_id: string
          p_was_successful?: boolean
        }
        Returns: string
      }
      select_prompt_variant: {
        Args: never
        Returns: {
          prompt_snippet: string
          variant_id: string
          variant_name: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
