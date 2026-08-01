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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      business_settings: {
        Row: {
          address: string
          created_at: string
          delivery_charges: number
          email: string
          hours: Json
          id: string
          logo_key: string
          maps_url: string
          min_order: number
          phone: string
          restaurant_name: string
          social: Json
          updated_at: string
          whatsapp_number: string
        }
        Insert: {
          address?: string
          created_at?: string
          delivery_charges?: number
          email?: string
          hours?: Json
          id?: string
          logo_key?: string
          maps_url?: string
          min_order?: number
          phone?: string
          restaurant_name?: string
          social?: Json
          updated_at?: string
          whatsapp_number?: string
        }
        Update: {
          address?: string
          created_at?: string
          delivery_charges?: number
          email?: string
          hours?: Json
          id?: string
          logo_key?: string
          maps_url?: string
          min_order?: number
          phone?: string
          restaurant_name?: string
          social?: Json
          updated_at?: string
          whatsapp_number?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          active: boolean
          addon_label: string
          created_at: string
          default_product_type: string
          display_order: number
          id: string
          name: string
          slug: string
          updated_at: string
          variant_label: string
        }
        Insert: {
          active?: boolean
          addon_label?: string
          created_at?: string
          default_product_type?: string
          display_order?: number
          id?: string
          name: string
          slug: string
          updated_at?: string
          variant_label?: string
        }
        Update: {
          active?: boolean
          addon_label?: string
          created_at?: string
          default_product_type?: string
          display_order?: number
          id?: string
          name?: string
          slug?: string
          updated_at?: string
          variant_label?: string
        }
        Relationships: []
      }
      customer_favorites: {
        Row: {
          created_at: string
          id: string
          menu_item_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          menu_item_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          menu_item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_favorites_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_images: {
        Row: {
          active: boolean
          caption: string | null
          created_at: string
          display_order: number
          id: string
          image_key: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          caption?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_key: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          caption?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      hero_content: {
        Row: {
          background_key: string
          banner_key: string
          created_at: string
          cta_text: string
          heading: string
          id: string
          subheading: string
          updated_at: string
        }
        Insert: {
          background_key?: string
          banner_key?: string
          created_at?: string
          cta_text?: string
          heading?: string
          id?: string
          subheading?: string
          updated_at?: string
        }
        Update: {
          background_key?: string
          banner_key?: string
          created_at?: string
          cta_text?: string
          heading?: string
          id?: string
          subheading?: string
          updated_at?: string
        }
        Relationships: []
      }
      loyalty_notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          kind: string
          program_id: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          kind?: string
          program_id?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          kind?: string
          program_id?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_notifications_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "loyalty_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_programs: {
        Row: {
          active: boolean
          applicable_customer_ids: string[]
          campaign: string
          created_at: string
          description: string
          earn_type: string
          expires_at: string | null
          expiry_days: number | null
          expiry_mode: string
          id: string
          name: string
          priority: number
          reward_label: string
          reward_menu_item_id: string | null
          reward_type: string
          reward_value: number
          stack_mode: string
          target_category_id: string | null
          target_menu_item_id: string | null
          threshold: number
          updated_at: string
          usage_limit_per_customer: number | null
        }
        Insert: {
          active?: boolean
          applicable_customer_ids?: string[]
          campaign?: string
          created_at?: string
          description?: string
          earn_type?: string
          expires_at?: string | null
          expiry_days?: number | null
          expiry_mode?: string
          id?: string
          name: string
          priority?: number
          reward_label?: string
          reward_menu_item_id?: string | null
          reward_type?: string
          reward_value?: number
          stack_mode?: string
          target_category_id?: string | null
          target_menu_item_id?: string | null
          threshold?: number
          updated_at?: string
          usage_limit_per_customer?: number | null
        }
        Update: {
          active?: boolean
          applicable_customer_ids?: string[]
          campaign?: string
          created_at?: string
          description?: string
          earn_type?: string
          expires_at?: string | null
          expiry_days?: number | null
          expiry_mode?: string
          id?: string
          name?: string
          priority?: number
          reward_label?: string
          reward_menu_item_id?: string | null
          reward_type?: string
          reward_value?: number
          stack_mode?: string
          target_category_id?: string | null
          target_menu_item_id?: string | null
          threshold?: number
          updated_at?: string
          usage_limit_per_customer?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_programs_reward_menu_item_id_fkey"
            columns: ["reward_menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_programs_target_category_id_fkey"
            columns: ["target_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_programs_target_menu_item_id_fkey"
            columns: ["target_menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_rewards: {
        Row: {
          created_at: string
          customer_phone: string
          expires_at: string | null
          id: string
          program_id: string
          redeemed_order_id: string | null
          reward_label: string
          reward_type: string
          reward_value: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_phone?: string
          expires_at?: string | null
          id?: string
          program_id: string
          redeemed_order_id?: string | null
          reward_label?: string
          reward_type: string
          reward_value?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          customer_phone?: string
          expires_at?: string | null
          id?: string
          program_id?: string
          redeemed_order_id?: string | null
          reward_label?: string
          reward_type?: string
          reward_value?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_rewards_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "loyalty_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_rewards_redeemed_order_id_fkey"
            columns: ["redeemed_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_item_addons: {
        Row: {
          available: boolean
          created_at: string
          display_order: number
          id: string
          menu_item_id: string
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          available?: boolean
          created_at?: string
          display_order?: number
          id?: string
          menu_item_id: string
          name: string
          price: number
          updated_at?: string
        }
        Update: {
          available?: boolean
          created_at?: string
          display_order?: number
          id?: string
          menu_item_id?: string
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_addons_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_item_variants: {
        Row: {
          available: boolean
          created_at: string
          display_order: number
          id: string
          menu_item_id: string
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          available?: boolean
          created_at?: string
          display_order?: number
          id?: string
          menu_item_id: string
          name: string
          price: number
          updated_at?: string
        }
        Update: {
          available?: boolean
          created_at?: string
          display_order?: number
          id?: string
          menu_item_id?: string
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_variants_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          active: boolean
          addon_label: string | null
          available_days: number[]
          available_from: string | null
          available_until: string | null
          badges: string[]
          category: string
          category_id: string | null
          created_at: string
          description: string
          display_order: number
          featured: boolean
          frequently_bought_ids: string[]
          id: string
          image_key: string
          in_stock: boolean
          max_addons: number | null
          meal_upgrade_ids: string[]
          meal_upgrade_label: string
          name: string
          prep_time_minutes: number | null
          price: number
          product_type: string
          recommended_ids: string[]
          search_keywords: string[]
          spice_level: number
          tag: string | null
          updated_at: string
          variant_label: string | null
          variant_required: boolean
        }
        Insert: {
          active?: boolean
          addon_label?: string | null
          available_days?: number[]
          available_from?: string | null
          available_until?: string | null
          badges?: string[]
          category: string
          category_id?: string | null
          created_at?: string
          description: string
          display_order?: number
          featured?: boolean
          frequently_bought_ids?: string[]
          id?: string
          image_key?: string
          in_stock?: boolean
          max_addons?: number | null
          meal_upgrade_ids?: string[]
          meal_upgrade_label?: string
          name: string
          prep_time_minutes?: number | null
          price: number
          product_type?: string
          recommended_ids?: string[]
          search_keywords?: string[]
          spice_level?: number
          tag?: string | null
          updated_at?: string
          variant_label?: string | null
          variant_required?: boolean
        }
        Update: {
          active?: boolean
          addon_label?: string | null
          available_days?: number[]
          available_from?: string | null
          available_until?: string | null
          badges?: string[]
          category?: string
          category_id?: string | null
          created_at?: string
          description?: string
          display_order?: number
          featured?: boolean
          frequently_bought_ids?: string[]
          id?: string
          image_key?: string
          in_stock?: boolean
          max_addons?: number | null
          meal_upgrade_ids?: string[]
          meal_upgrade_label?: string
          name?: string
          prep_time_minutes?: number | null
          price?: number
          product_type?: string
          recommended_ids?: string[]
          search_keywords?: string[]
          spice_level?: number
          tag?: string | null
          updated_at?: string
          variant_label?: string | null
          variant_required?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          active: boolean
          created_at: string
          description: string
          discount_label: string | null
          display_order: number
          ends_at: string | null
          id: string
          image_key: string
          starts_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string
          discount_label?: string | null
          display_order?: number
          ends_at?: string | null
          id?: string
          image_key?: string
          starts_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string
          discount_label?: string | null
          display_order?: number
          ends_at?: string | null
          id?: string
          image_key?: string
          starts_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          created_at: string
          customer_name: string
          customer_phone: string
          discount: number
          id: string
          items: Json
          notes: string | null
          status: string
          subtotal: number
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_name: string
          customer_phone: string
          discount?: number
          id?: string
          items?: Json
          notes?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          customer_name?: string
          customer_phone?: string
          discount?: number
          id?: string
          items?: Json
          notes?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      promotion_items: {
        Row: {
          created_at: string
          id: string
          menu_item_id: string
          promotion_id: string
          quantity: number
          role: string
        }
        Insert: {
          created_at?: string
          id?: string
          menu_item_id: string
          promotion_id: string
          quantity?: number
          role?: string
        }
        Update: {
          created_at?: string
          id?: string
          menu_item_id?: string
          promotion_id?: string
          quantity?: number
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_items_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_redemptions: {
        Row: {
          created_at: string
          customer_phone: string
          discount_amount: number
          id: string
          label: string
          order_id: string | null
          promotion_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_phone?: string
          discount_amount?: number
          id?: string
          label?: string
          order_id?: string | null
          promotion_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          customer_phone?: string
          discount_amount?: number
          id?: string
          label?: string
          order_id?: string | null
          promotion_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_redemptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_redemptions_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          active: boolean
          applicable_customer_ids: string[]
          badge_label: string
          bundle_price: number | null
          buy_quantity: number
          campaign: string
          created_at: string
          days_of_week: number[]
          description: string
          discount_value: number
          end_time: string | null
          ends_at: string | null
          featured: boolean
          free_delivery: boolean
          get_discount_percent: number
          get_menu_item_id: string | null
          get_quantity: number
          headline: string
          id: string
          image_key: string
          min_order_amount: number
          name: string
          per_customer_limit: number | null
          priority: number
          promo_type: string
          season: string
          seo_description: string
          seo_title: string
          slug: string
          stack_mode: string
          start_time: string | null
          starts_at: string | null
          stock_limit: number | null
          target_category_ids: string[]
          target_menu_item_ids: string[]
          target_scope: string
          target_variant_ids: string[]
          updated_at: string
          usage_count: number
          usage_limit: number | null
        }
        Insert: {
          active?: boolean
          applicable_customer_ids?: string[]
          badge_label?: string
          bundle_price?: number | null
          buy_quantity?: number
          campaign?: string
          created_at?: string
          days_of_week?: number[]
          description?: string
          discount_value?: number
          end_time?: string | null
          ends_at?: string | null
          featured?: boolean
          free_delivery?: boolean
          get_discount_percent?: number
          get_menu_item_id?: string | null
          get_quantity?: number
          headline?: string
          id?: string
          image_key?: string
          min_order_amount?: number
          name: string
          per_customer_limit?: number | null
          priority?: number
          promo_type?: string
          season?: string
          seo_description?: string
          seo_title?: string
          slug: string
          stack_mode?: string
          start_time?: string | null
          starts_at?: string | null
          stock_limit?: number | null
          target_category_ids?: string[]
          target_menu_item_ids?: string[]
          target_scope?: string
          target_variant_ids?: string[]
          updated_at?: string
          usage_count?: number
          usage_limit?: number | null
        }
        Update: {
          active?: boolean
          applicable_customer_ids?: string[]
          badge_label?: string
          bundle_price?: number | null
          buy_quantity?: number
          campaign?: string
          created_at?: string
          days_of_week?: number[]
          description?: string
          discount_value?: number
          end_time?: string | null
          ends_at?: string | null
          featured?: boolean
          free_delivery?: boolean
          get_discount_percent?: number
          get_menu_item_id?: string | null
          get_quantity?: number
          headline?: string
          id?: string
          image_key?: string
          min_order_amount?: number
          name?: string
          per_customer_limit?: number | null
          priority?: number
          promo_type?: string
          season?: string
          seo_description?: string
          seo_title?: string
          slug?: string
          stack_mode?: string
          start_time?: string | null
          starts_at?: string | null
          stock_limit?: number | null
          target_category_ids?: string[]
          target_menu_item_ids?: string[]
          target_scope?: string
          target_variant_ids?: string[]
          updated_at?: string
          usage_count?: number
          usage_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "promotions_get_menu_item_id_fkey"
            columns: ["get_menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      testimonials: {
        Row: {
          active: boolean
          created_at: string
          customer_name: string
          display_order: number
          id: string
          image_key: string | null
          rating: number
          review: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          customer_name: string
          display_order?: number
          id?: string
          image_key?: string | null
          rating?: number
          review: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          customer_name?: string
          display_order?: number
          id?: string
          image_key?: string | null
          rating?: number
          review?: string
          updated_at?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_exists: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
