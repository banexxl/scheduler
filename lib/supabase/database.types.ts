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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      appointment_access_tokens: {
        Row: {
          appointment_id: string
          created_at: string
          encryption_key_version: number
          expires_at: string
          id: string
          last_used_at: string | null
          purpose: string
          revocation_reason: string | null
          revoked_at: string | null
          tenant_id: string
          token_auth_tag: string
          token_ciphertext: string
          token_hash: string
          token_iv: string
          token_prefix: string
          updated_at: string
          use_count: number
        }
        Insert: {
          appointment_id: string
          created_at?: string
          encryption_key_version?: number
          expires_at: string
          id?: string
          last_used_at?: string | null
          purpose?: string
          revocation_reason?: string | null
          revoked_at?: string | null
          tenant_id: string
          token_auth_tag: string
          token_ciphertext: string
          token_hash: string
          token_iv: string
          token_prefix: string
          updated_at?: string
          use_count?: number
        }
        Update: {
          appointment_id?: string
          created_at?: string
          encryption_key_version?: number
          expires_at?: string
          id?: string
          last_used_at?: string | null
          purpose?: string
          revocation_reason?: string | null
          revoked_at?: string | null
          tenant_id?: string
          token_auth_tag?: string
          token_ciphertext?: string
          token_hash?: string
          token_iv?: string
          token_prefix?: string
          updated_at?: string
          use_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "appointment_access_tokens_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_access_tokens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_customer_actions: {
        Row: {
          access_token_id: string | null
          action_type: string
          appointment_id: string
          created_at: string
          failure_code: string | null
          id: string
          ip_hash: string | null
          new_resource_id: string | null
          new_starts_at: string | null
          previous_resource_id: string | null
          previous_starts_at: string | null
          reason: string | null
          status: string
          tenant_id: string
          user_agent_summary: string | null
        }
        Insert: {
          access_token_id?: string | null
          action_type: string
          appointment_id: string
          created_at?: string
          failure_code?: string | null
          id?: string
          ip_hash?: string | null
          new_resource_id?: string | null
          new_starts_at?: string | null
          previous_resource_id?: string | null
          previous_starts_at?: string | null
          reason?: string | null
          status: string
          tenant_id: string
          user_agent_summary?: string | null
        }
        Update: {
          access_token_id?: string | null
          action_type?: string
          appointment_id?: string
          created_at?: string
          failure_code?: string | null
          id?: string
          ip_hash?: string | null
          new_resource_id?: string | null
          new_starts_at?: string | null
          previous_resource_id?: string | null
          previous_starts_at?: string | null
          reason?: string | null
          status?: string
          tenant_id?: string
          user_agent_summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_customer_actions_access_token_id_fkey"
            columns: ["access_token_id"]
            isOneToOne: false
            referencedRelation: "appointment_access_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_customer_actions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_customer_actions_new_resource_id_fkey"
            columns: ["new_resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_customer_actions_previous_resource_id_fkey"
            columns: ["previous_resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_customer_actions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_customer_requests: {
        Row: {
          access_token_id: string
          appointment_id: string
          completed_at: string | null
          created_at: string
          id: string
          idempotency_key: string
          request_hash: string
          request_type: string
          result_snapshot: Json | null
          status: string
          tenant_id: string
        }
        Insert: {
          access_token_id: string
          appointment_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          idempotency_key: string
          request_hash: string
          request_type: string
          result_snapshot?: Json | null
          status: string
          tenant_id: string
        }
        Update: {
          access_token_id?: string
          appointment_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string
          request_hash?: string
          request_type?: string
          result_snapshot?: Json | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_customer_requests_access_token_id_fkey"
            columns: ["access_token_id"]
            isOneToOne: false
            referencedRelation: "appointment_access_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_customer_requests_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_customer_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_payments: {
        Row: {
          amount_paid: number
          amount_refunded: number
          amount_total: number
          appointment_id: string
          created_at: string
          currency: string
          id: string
          latest_payment_intent_id: string | null
          paid_at: string | null
          payment_requirement: string
          provider: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          amount_refunded?: number
          amount_total: number
          appointment_id: string
          created_at?: string
          currency: string
          id?: string
          latest_payment_intent_id?: string | null
          paid_at?: string | null
          payment_requirement?: string
          provider?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          amount_refunded?: number
          amount_total?: number
          appointment_id?: string
          created_at?: string
          currency?: string
          id?: string
          latest_payment_intent_id?: string | null
          paid_at?: string | null
          payment_requirement?: string
          provider?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_payments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_reminders: {
        Row: {
          appointment_id: string
          cancellation_reason: string | null
          cancelled_at: string | null
          channel: string
          claimed_at: string | null
          claimed_by: string | null
          created_at: string
          enqueued_at: string | null
          id: string
          outbox_id: string | null
          reminder_rule_id: string
          schedule_version: number
          scheduled_for: string
          sent_at: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          appointment_id: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          channel?: string
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          enqueued_at?: string | null
          id?: string
          outbox_id?: string | null
          reminder_rule_id: string
          schedule_version: number
          scheduled_for: string
          sent_at?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          channel?: string
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          enqueued_at?: string | null
          id?: string
          outbox_id?: string | null
          reminder_rule_id?: string
          schedule_version?: number
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_reminders_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_reminders_outbox_id_fkey"
            columns: ["outbox_id"]
            isOneToOne: false
            referencedRelation: "notification_outbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_reminders_reminder_rule_id_fkey"
            columns: ["reminder_rule_id"]
            isOneToOne: false
            referencedRelation: "tenant_reminder_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_reminders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_review_tokens: {
        Row: {
          appointment_id: string
          created_at: string
          expires_at: string
          id: string
          revoked_at: string | null
          tenant_id: string
          token_hash: string
          token_prefix: string
          used_at: string | null
        }
        Insert: {
          appointment_id: string
          created_at?: string
          expires_at: string
          id?: string
          revoked_at?: string | null
          tenant_id: string
          token_hash: string
          token_prefix: string
          used_at?: string | null
        }
        Update: {
          appointment_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          revoked_at?: string | null
          tenant_id?: string
          token_hash?: string
          token_prefix?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_review_tokens_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_review_tokens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_sequences: {
        Row: {
          created_at: string
          current_value: number
          id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_value?: number
          id?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_value?: number
          id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_sequences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_status_history: {
        Row: {
          appointment_id: string
          changed_at: string
          changed_by: string | null
          created_at: string
          from_status: string
          id: string
          tenant_id: string
          to_status: string
        }
        Insert: {
          appointment_id: string
          changed_at?: string
          changed_by?: string | null
          created_at?: string
          from_status: string
          id?: string
          tenant_id: string
          to_status: string
        }
        Update: {
          appointment_id?: string
          changed_at?: string
          changed_by?: string | null
          created_at?: string
          from_status?: string
          id?: string
          tenant_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_status_history_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_status_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_number: string
          buffer_after_minutes: number
          buffer_before_minutes: number
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          checked_in_at: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          currency: string
          customer_email: string | null
          customer_id: string | null
          customer_name: string
          customer_notes: string | null
          customer_package_id: string | null
          customer_package_usage_id: string | null
          customer_phone: string | null
          duration_minutes: number
          ends_at: string
          id: string
          internal_notes: string | null
          location_id: string
          location_name_snapshot: string
          no_show_at: string | null
          occupied_ends_at: string
          occupied_starts_at: string
          package_credits_used: number | null
          package_name_snapshot: string | null
          price: number
          resource_id: string
          resource_name_snapshot: string
          schedule_version: number
          service_id: string
          service_name_snapshot: string
          service_started_at: string | null
          source: string
          starts_at: string
          status: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          appointment_number: string
          buffer_after_minutes?: number
          buffer_before_minutes?: number
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          checked_in_at?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          currency: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name: string
          customer_notes?: string | null
          customer_package_id?: string | null
          customer_package_usage_id?: string | null
          customer_phone?: string | null
          duration_minutes: number
          ends_at: string
          id?: string
          internal_notes?: string | null
          location_id: string
          location_name_snapshot: string
          no_show_at?: string | null
          occupied_ends_at: string
          occupied_starts_at: string
          package_credits_used?: number | null
          package_name_snapshot?: string | null
          price?: number
          resource_id: string
          resource_name_snapshot: string
          schedule_version?: number
          service_id: string
          service_name_snapshot: string
          service_started_at?: string | null
          source?: string
          starts_at: string
          status?: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          appointment_number?: string
          buffer_after_minutes?: number
          buffer_before_minutes?: number
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          checked_in_at?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_notes?: string | null
          customer_package_id?: string | null
          customer_package_usage_id?: string | null
          customer_phone?: string | null
          duration_minutes?: number
          ends_at?: string
          id?: string
          internal_notes?: string | null
          location_id?: string
          location_name_snapshot?: string
          no_show_at?: string | null
          occupied_ends_at?: string
          occupied_starts_at?: string
          package_credits_used?: number | null
          package_name_snapshot?: string | null
          price?: number
          resource_id?: string
          resource_name_snapshot?: string
          schedule_version?: number
          service_id?: string
          service_name_snapshot?: string
          service_started_at?: string | null
          source?: string
          starts_at?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_type: string
          actor_user_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: number
          metadata: Json
          new_data: Json | null
          old_data: Json | null
          tenant_id: string | null
        }
        Insert: {
          action: string
          actor_type?: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: never
          metadata?: Json
          new_data?: Json | null
          old_data?: Json | null
          tenant_id?: string | null
        }
        Update: {
          action?: string
          actor_type?: string
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: never
          metadata?: Json
          new_data?: Json | null
          old_data?: Json | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_checkout_sessions: {
        Row: {
          billing_plan_id: string
          billing_plan_price_id: string
          checkout_metadata: Json
          checkout_url: string | null
          completed_at: string | null
          created_at: string
          expires_at: string | null
          external_customer_id: string
          id: string
          polar_checkout_id: string | null
          polar_created_at: string | null
          polar_modified_at: string | null
          polar_price_id: string
          polar_product_id: string
          request_key: string
          requested_by: string
          return_url: string
          status: string
          success_url: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          billing_plan_id: string
          billing_plan_price_id: string
          checkout_metadata?: Json
          checkout_url?: string | null
          completed_at?: string | null
          created_at?: string
          expires_at?: string | null
          external_customer_id: string
          id?: string
          polar_checkout_id?: string | null
          polar_created_at?: string | null
          polar_modified_at?: string | null
          polar_price_id: string
          polar_product_id: string
          request_key: string
          requested_by: string
          return_url: string
          status?: string
          success_url: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          billing_plan_id?: string
          billing_plan_price_id?: string
          checkout_metadata?: Json
          checkout_url?: string | null
          completed_at?: string | null
          created_at?: string
          expires_at?: string | null
          external_customer_id?: string
          id?: string
          polar_checkout_id?: string | null
          polar_created_at?: string | null
          polar_modified_at?: string | null
          polar_price_id?: string
          polar_product_id?: string
          request_key?: string
          requested_by?: string
          return_url?: string
          status?: string
          success_url?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_checkout_sessions_billing_plan_id_fkey"
            columns: ["billing_plan_id"]
            isOneToOne: false
            referencedRelation: "billing_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_checkout_sessions_billing_plan_price_id_fkey"
            columns: ["billing_plan_price_id"]
            isOneToOne: false
            referencedRelation: "billing_plan_prices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_checkout_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_financial_state_history: {
        Row: {
          billing_order_id: string
          change_source: string
          change_summary: Json
          created_at: string
          effective_at: string
          event_type: string
          id: string
          new_paid_state: boolean
          new_refunded_amount: number
          new_status: string
          previous_paid_state: boolean | null
          previous_refunded_amount: number | null
          previous_status: string | null
          tenant_id: string
        }
        Insert: {
          billing_order_id: string
          change_source?: string
          change_summary?: Json
          created_at?: string
          effective_at?: string
          event_type: string
          id?: string
          new_paid_state: boolean
          new_refunded_amount: number
          new_status: string
          previous_paid_state?: boolean | null
          previous_refunded_amount?: number | null
          previous_status?: string | null
          tenant_id: string
        }
        Update: {
          billing_order_id?: string
          change_source?: string
          change_summary?: Json
          created_at?: string
          effective_at?: string
          event_type?: string
          id?: string
          new_paid_state?: boolean
          new_refunded_amount?: number
          new_status?: string
          previous_paid_state?: boolean | null
          previous_refunded_amount?: number | null
          previous_status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_financial_state_history_billing_order_id_fkey"
            columns: ["billing_order_id"]
            isOneToOne: false
            referencedRelation: "billing_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_financial_state_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_orders: {
        Row: {
          billing_plan_id: string | null
          billing_plan_price_id: string | null
          billing_reason: string | null
          created_at: string
          currency: string
          discount_amount: number
          id: string
          invoice_number: string | null
          invoice_url: string | null
          is_paid: boolean
          last_event_at: string | null
          last_event_id: string | null
          last_synced_at: string
          net_amount: number
          order_metadata: Json
          order_number: string | null
          paid_at: string | null
          polar_checkout_id: string | null
          polar_created_at: string | null
          polar_customer_id: string
          polar_modified_at: string | null
          polar_order_id: string
          polar_price_id: string | null
          polar_product_id: string | null
          polar_subscription_id: string | null
          receipt_url: string | null
          refunded_amount: number
          status: string
          subtotal_amount: number
          sync_error_code: string | null
          sync_error_message: string | null
          sync_status: string
          tax_amount: number
          tenant_billing_customer_id: string
          tenant_id: string
          tenant_subscription_id: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          billing_plan_id?: string | null
          billing_plan_price_id?: string | null
          billing_reason?: string | null
          created_at?: string
          currency: string
          discount_amount?: number
          id?: string
          invoice_number?: string | null
          invoice_url?: string | null
          is_paid?: boolean
          last_event_at?: string | null
          last_event_id?: string | null
          last_synced_at?: string
          net_amount?: number
          order_metadata?: Json
          order_number?: string | null
          paid_at?: string | null
          polar_checkout_id?: string | null
          polar_created_at?: string | null
          polar_customer_id: string
          polar_modified_at?: string | null
          polar_order_id: string
          polar_price_id?: string | null
          polar_product_id?: string | null
          polar_subscription_id?: string | null
          receipt_url?: string | null
          refunded_amount?: number
          status: string
          subtotal_amount?: number
          sync_error_code?: string | null
          sync_error_message?: string | null
          sync_status?: string
          tax_amount?: number
          tenant_billing_customer_id: string
          tenant_id: string
          tenant_subscription_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Update: {
          billing_plan_id?: string | null
          billing_plan_price_id?: string | null
          billing_reason?: string | null
          created_at?: string
          currency?: string
          discount_amount?: number
          id?: string
          invoice_number?: string | null
          invoice_url?: string | null
          is_paid?: boolean
          last_event_at?: string | null
          last_event_id?: string | null
          last_synced_at?: string
          net_amount?: number
          order_metadata?: Json
          order_number?: string | null
          paid_at?: string | null
          polar_checkout_id?: string | null
          polar_created_at?: string | null
          polar_customer_id?: string
          polar_modified_at?: string | null
          polar_order_id?: string
          polar_price_id?: string | null
          polar_product_id?: string | null
          polar_subscription_id?: string | null
          receipt_url?: string | null
          refunded_amount?: number
          status?: string
          subtotal_amount?: number
          sync_error_code?: string | null
          sync_error_message?: string | null
          sync_status?: string
          tax_amount?: number
          tenant_billing_customer_id?: string
          tenant_id?: string
          tenant_subscription_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_orders_billing_plan_id_fkey"
            columns: ["billing_plan_id"]
            isOneToOne: false
            referencedRelation: "billing_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_orders_billing_plan_price_id_fkey"
            columns: ["billing_plan_price_id"]
            isOneToOne: false
            referencedRelation: "billing_plan_prices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_orders_tenant_billing_customer_id_fkey"
            columns: ["tenant_billing_customer_id"]
            isOneToOne: false
            referencedRelation: "tenant_billing_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_orders_tenant_subscription_id_fkey"
            columns: ["tenant_subscription_id"]
            isOneToOne: false
            referencedRelation: "tenant_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_plan_prices: {
        Row: {
          amount: number | null
          billing_interval: string | null
          billing_interval_count: number | null
          billing_plan_id: string
          created_at: string
          currency: string | null
          id: string
          is_active: boolean
          is_archived: boolean
          is_checkout_eligible: boolean
          is_recurring: boolean
          last_synced_at: string
          polar_created_at: string | null
          polar_modified_at: string | null
          polar_price_id: string
          polar_product_id: string
          price_metadata: Json
          price_type: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          billing_interval?: string | null
          billing_interval_count?: number | null
          billing_plan_id: string
          created_at?: string
          currency?: string | null
          id?: string
          is_active?: boolean
          is_archived?: boolean
          is_checkout_eligible?: boolean
          is_recurring?: boolean
          last_synced_at?: string
          polar_created_at?: string | null
          polar_modified_at?: string | null
          polar_price_id: string
          polar_product_id: string
          price_metadata?: Json
          price_type: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          billing_interval?: string | null
          billing_interval_count?: number | null
          billing_plan_id?: string
          created_at?: string
          currency?: string | null
          id?: string
          is_active?: boolean
          is_archived?: boolean
          is_checkout_eligible?: boolean
          is_recurring?: boolean
          last_synced_at?: string
          polar_created_at?: string | null
          polar_modified_at?: string | null
          polar_price_id?: string
          polar_product_id?: string
          price_metadata?: Json
          price_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_plan_prices_billing_plan_id_fkey"
            columns: ["billing_plan_id"]
            isOneToOne: false
            referencedRelation: "billing_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_plans: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_free: boolean
          is_public: boolean
          last_synced_at: string | null
          name: string
          plan_key: string
          polar_created_at: string | null
          polar_modified_at: string | null
          polar_product_description: string | null
          polar_product_id: string | null
          polar_product_name: string | null
          product_metadata: Json
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_free?: boolean
          is_public?: boolean
          last_synced_at?: string | null
          name: string
          plan_key: string
          polar_created_at?: string | null
          polar_modified_at?: string | null
          polar_product_description?: string | null
          polar_product_id?: string | null
          polar_product_name?: string | null
          product_metadata?: Json
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_free?: boolean
          is_public?: boolean
          last_synced_at?: string | null
          name?: string
          plan_key?: string
          polar_created_at?: string | null
          polar_modified_at?: string | null
          polar_product_description?: string | null
          polar_product_id?: string | null
          polar_product_name?: string | null
          product_metadata?: Json
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      billing_refunds: {
        Row: {
          amount: number
          billing_order_id: string
          created_at: string
          currency: string
          id: string
          last_event_at: string | null
          last_event_id: string | null
          last_synced_at: string
          polar_created_at: string | null
          polar_modified_at: string | null
          polar_order_id: string
          polar_refund_id: string
          provider_reason: string | null
          reason: string | null
          refund_metadata: Json
          status: string
          sync_error_code: string | null
          sync_error_message: string | null
          sync_status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          billing_order_id: string
          created_at?: string
          currency: string
          id?: string
          last_event_at?: string | null
          last_event_id?: string | null
          last_synced_at?: string
          polar_created_at?: string | null
          polar_modified_at?: string | null
          polar_order_id: string
          polar_refund_id: string
          provider_reason?: string | null
          reason?: string | null
          refund_metadata?: Json
          status: string
          sync_error_code?: string | null
          sync_error_message?: string | null
          sync_status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          billing_order_id?: string
          created_at?: string
          currency?: string
          id?: string
          last_event_at?: string | null
          last_event_id?: string | null
          last_synced_at?: string
          polar_created_at?: string | null
          polar_modified_at?: string | null
          polar_order_id?: string
          polar_refund_id?: string
          provider_reason?: string | null
          reason?: string | null
          refund_metadata?: Json
          status?: string
          sync_error_code?: string | null
          sync_error_message?: string | null
          sync_status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_refunds_billing_order_id_fkey"
            columns: ["billing_order_id"]
            isOneToOne: false
            referencedRelation: "billing_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_refunds_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_subscription_state_history: {
        Row: {
          change_source: string
          change_summary: Json
          created_at: string
          effective_at: string
          id: string
          new_access_state: string
          new_status: string
          polar_event_id: string | null
          previous_access_state: string | null
          previous_status: string | null
          tenant_id: string
          tenant_subscription_id: string
        }
        Insert: {
          change_source: string
          change_summary?: Json
          created_at?: string
          effective_at: string
          id?: string
          new_access_state: string
          new_status: string
          polar_event_id?: string | null
          previous_access_state?: string | null
          previous_status?: string | null
          tenant_id: string
          tenant_subscription_id: string
        }
        Update: {
          change_source?: string
          change_summary?: Json
          created_at?: string
          effective_at?: string
          id?: string
          new_access_state?: string
          new_status?: string
          polar_event_id?: string | null
          previous_access_state?: string | null
          previous_status?: string | null
          tenant_id?: string
          tenant_subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_subscription_state_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_subscription_state_history_tenant_subscription_id_fkey"
            columns: ["tenant_subscription_id"]
            isOneToOne: false
            referencedRelation: "tenant_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_sync_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          details: Json
          id: string
          prices_archived: number
          prices_created: number
          prices_updated: number
          products_conflict: number
          products_failed: number
          products_seen: number
          products_synced: number
          products_unmapped: number
          requested_by: string | null
          run_type: string
          started_at: string
          status: string
          sync_source: string
          updated_at: string
          worker_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          details?: Json
          id?: string
          prices_archived?: number
          prices_created?: number
          prices_updated?: number
          products_conflict?: number
          products_failed?: number
          products_seen?: number
          products_synced?: number
          products_unmapped?: number
          requested_by?: string | null
          run_type: string
          started_at?: string
          status?: string
          sync_source: string
          updated_at?: string
          worker_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          details?: Json
          id?: string
          prices_archived?: number
          prices_created?: number
          prices_updated?: number
          products_conflict?: number
          products_failed?: number
          products_seen?: number
          products_synced?: number
          products_unmapped?: number
          requested_by?: string | null
          run_type?: string
          started_at?: string
          status?: string
          sync_source?: string
          updated_at?: string
          worker_id?: string | null
        }
        Relationships: []
      }
      billing_webhook_events: {
        Row: {
          attempt_count: number
          created_at: string
          event_timestamp: string
          event_type: string
          id: string
          ignored_at: string | null
          last_error_code: string | null
          last_error_message: string | null
          next_attempt_at: string
          organization_id: string | null
          payload: Json
          payload_hash: string
          polar_event_id: string
          processed_at: string | null
          processing_started_at: string | null
          processing_worker_id: string | null
          resource_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          event_timestamp: string
          event_type: string
          id?: string
          ignored_at?: string | null
          last_error_code?: string | null
          last_error_message?: string | null
          next_attempt_at?: string
          organization_id?: string | null
          payload: Json
          payload_hash: string
          polar_event_id: string
          processed_at?: string | null
          processing_started_at?: string | null
          processing_worker_id?: string | null
          resource_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          created_at?: string
          event_timestamp?: string
          event_type?: string
          id?: string
          ignored_at?: string | null
          last_error_code?: string | null
          last_error_message?: string | null
          next_attempt_at?: string
          organization_id?: string | null
          payload?: Json
          payload_hash?: string
          polar_event_id?: string
          processed_at?: string | null
          processing_started_at?: string | null
          processing_worker_id?: string | null
          resource_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      customer_account_tenant_links: {
        Row: {
          created_at: string
          customer_account_id: string
          id: string
          link_method: string
          link_status: string
          linked_at: string
          tenant_customer_id: string
          tenant_id: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          customer_account_id: string
          id?: string
          link_method: string
          link_status?: string
          linked_at?: string
          tenant_customer_id: string
          tenant_id: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          customer_account_id?: string
          id?: string
          link_method?: string
          link_status?: string
          linked_at?: string
          tenant_customer_id?: string
          tenant_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_account_tenant_links_customer_account_id_fkey"
            columns: ["customer_account_id"]
            isOneToOne: false
            referencedRelation: "customer_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_account_tenant_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_accounts: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          email_verified_at: string | null
          full_name: string | null
          id: string
          is_active: boolean
          phone: string | null
          preferred_language: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          email_verified_at?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          preferred_language?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          email_verified_at?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          preferred_language?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customer_favorite_resources: {
        Row: {
          created_at: string
          customer_account_id: string
          id: string
          resource_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          customer_account_id: string
          id?: string
          resource_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          customer_account_id?: string
          id?: string
          resource_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_favorite_resources_customer_account_id_fkey"
            columns: ["customer_account_id"]
            isOneToOne: false
            referencedRelation: "customer_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_favorite_resources_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_favorite_resources_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_favorite_services: {
        Row: {
          created_at: string
          customer_account_id: string
          id: string
          service_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          customer_account_id: string
          id?: string
          service_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          customer_account_id?: string
          id?: string
          service_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_favorite_services_customer_account_id_fkey"
            columns: ["customer_account_id"]
            isOneToOne: false
            referencedRelation: "customer_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_favorite_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_favorite_services_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_favorite_tenants: {
        Row: {
          created_at: string
          customer_account_id: string
          id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          customer_account_id: string
          id?: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          customer_account_id?: string
          id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_favorite_tenants_customer_account_id_fkey"
            columns: ["customer_account_id"]
            isOneToOne: false
            referencedRelation: "customer_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_favorite_tenants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_loyalty_accounts: {
        Row: {
          completed_visit_count: number
          created_at: string
          customer_id: string
          id: string
          last_earned_at: string | null
          lifetime_points_earned: number
          points_balance: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          completed_visit_count?: number
          created_at?: string
          customer_id: string
          id?: string
          last_earned_at?: string | null
          lifetime_points_earned?: number
          points_balance?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          completed_visit_count?: number
          created_at?: string
          customer_id?: string
          id?: string
          last_earned_at?: string | null
          lifetime_points_earned?: number
          points_balance?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_loyalty_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_loyalty_transactions: {
        Row: {
          appointment_id: string | null
          balance_after: number
          created_at: string
          created_by: string | null
          customer_id: string
          customer_loyalty_account_id: string
          id: string
          idempotency_key: string | null
          points_delta: number
          reason: string | null
          tenant_id: string
          transaction_type: string
        }
        Insert: {
          appointment_id?: string | null
          balance_after: number
          created_at?: string
          created_by?: string | null
          customer_id: string
          customer_loyalty_account_id: string
          id?: string
          idempotency_key?: string | null
          points_delta: number
          reason?: string | null
          tenant_id: string
          transaction_type: string
        }
        Update: {
          appointment_id?: string | null
          balance_after?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string
          customer_loyalty_account_id?: string
          id?: string
          idempotency_key?: string | null
          points_delta?: number
          reason?: string | null
          tenant_id?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_loyalty_transactions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_loyalty_transactions_customer_loyalty_account_id_fkey"
            columns: ["customer_loyalty_account_id"]
            isOneToOne: false
            referencedRelation: "customer_loyalty_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_loyalty_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_notification_preferences: {
        Row: {
          appointment_reminders_enabled: boolean
          created_at: string
          id: string
          review_requests_enabled: boolean
          tenant_customer_id: string
          tenant_id: string
          updated_at: string
          waitlist_notifications_enabled: boolean
        }
        Insert: {
          appointment_reminders_enabled?: boolean
          created_at?: string
          id?: string
          review_requests_enabled?: boolean
          tenant_customer_id: string
          tenant_id: string
          updated_at?: string
          waitlist_notifications_enabled?: boolean
        }
        Update: {
          appointment_reminders_enabled?: boolean
          created_at?: string
          id?: string
          review_requests_enabled?: boolean
          tenant_customer_id?: string
          tenant_id?: string
          updated_at?: string
          waitlist_notifications_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "customer_notification_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_package_adjustments: {
        Row: {
          adjusted_by: string | null
          created_at: string
          customer_package_id: string
          delta: number
          id: string
          reason: string
          tenant_id: string
        }
        Insert: {
          adjusted_by?: string | null
          created_at?: string
          customer_package_id: string
          delta: number
          id?: string
          reason: string
          tenant_id: string
        }
        Update: {
          adjusted_by?: string | null
          created_at?: string
          customer_package_id?: string
          delta?: number
          id?: string
          reason?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_package_adjustments_customer_package_id_fkey"
            columns: ["customer_package_id"]
            isOneToOne: false
            referencedRelation: "customer_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_package_adjustments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_package_usage: {
        Row: {
          appointment_id: string
          consumed_at: string | null
          created_at: string
          credits_used: number
          customer_package_id: string
          id: string
          released_at: string | null
          reserved_at: string | null
          service_id: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          appointment_id: string
          consumed_at?: string | null
          created_at?: string
          credits_used: number
          customer_package_id: string
          id?: string
          released_at?: string | null
          reserved_at?: string | null
          service_id: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string
          consumed_at?: string | null
          created_at?: string
          credits_used?: number
          customer_package_id?: string
          id?: string
          released_at?: string | null
          reserved_at?: string | null
          service_id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_package_usage_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_package_usage_customer_package_id_fkey"
            columns: ["customer_package_id"]
            isOneToOne: false
            referencedRelation: "customer_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_package_usage_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_package_usage_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_packages: {
        Row: {
          assigned_by: string | null
          assignment_note: string | null
          created_at: string
          credits_remaining: number
          credits_total: number
          customer_id: string
          expires_at: string | null
          id: string
          package_id: string
          source: string
          starts_at: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          assignment_note?: string | null
          created_at?: string
          credits_remaining: number
          credits_total: number
          customer_id: string
          expires_at?: string | null
          id?: string
          package_id: string
          source?: string
          starts_at?: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          assignment_note?: string | null
          created_at?: string
          credits_remaining?: number
          credits_total?: number
          customer_id?: string
          expires_at?: string | null
          id?: string
          package_id?: string
          source?: string
          starts_at?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_packages_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "service_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_packages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_portal_access_tokens: {
        Row: {
          created_at: string
          customer_id: string | null
          expires_at: string
          id: string
          normalized_email: string
          revoked_at: string | null
          tenant_id: string
          token_hash: string
          token_prefix: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          expires_at: string
          id?: string
          normalized_email: string
          revoked_at?: string | null
          tenant_id: string
          token_hash: string
          token_prefix: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          expires_at?: string
          id?: string
          normalized_email?: string
          revoked_at?: string | null
          tenant_id?: string
          token_hash?: string
          token_prefix?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_portal_access_tokens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_portal_sessions: {
        Row: {
          created_at: string
          customer_id: string | null
          expires_at: string
          id: string
          last_used_at: string | null
          normalized_email: string
          revoked_at: string | null
          session_hash: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          expires_at: string
          id?: string
          last_used_at?: string | null
          normalized_email: string
          revoked_at?: string | null
          session_hash: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          expires_at?: string
          id?: string
          last_used_at?: string | null
          normalized_email?: string
          revoked_at?: string | null
          session_hash?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_portal_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_reviews: {
        Row: {
          appointment_id: string
          business_response: string | null
          comment: string | null
          created_at: string
          customer_id: string | null
          customer_name_snapshot: string | null
          id: string
          is_featured: boolean
          location_id: string | null
          rating: number
          resource_id: string | null
          resource_name_snapshot: string | null
          responded_at: string | null
          responded_by: string | null
          service_id: string | null
          service_name_snapshot: string | null
          status: string
          submitted_at: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          appointment_id: string
          business_response?: string | null
          comment?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name_snapshot?: string | null
          id?: string
          is_featured?: boolean
          location_id?: string | null
          rating: number
          resource_id?: string | null
          resource_name_snapshot?: string | null
          responded_at?: string | null
          responded_by?: string | null
          service_id?: string | null
          service_name_snapshot?: string | null
          status?: string
          submitted_at?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string
          business_response?: string | null
          comment?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name_snapshot?: string | null
          id?: string
          is_featured?: boolean
          location_id?: string | null
          rating?: number
          resource_id?: string | null
          resource_name_snapshot?: string | null
          responded_at?: string | null
          responded_by?: string | null
          service_id?: string | null
          service_name_snapshot?: string | null
          status?: string
          submitted_at?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_reviews_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_reviews_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_reviews_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_reviews_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_reviews_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_reward_redemptions: {
        Row: {
          created_at: string
          customer_id: string
          customer_loyalty_account_id: string
          id: string
          loyalty_reward_id: string
          note: string | null
          points_spent: number
          redeemed_at: string
          redeemed_by: string | null
          reward_name_snapshot: string
          tenant_id: string
          visits_threshold_snapshot: number | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          customer_loyalty_account_id: string
          id?: string
          loyalty_reward_id: string
          note?: string | null
          points_spent?: number
          redeemed_at?: string
          redeemed_by?: string | null
          reward_name_snapshot: string
          tenant_id: string
          visits_threshold_snapshot?: number | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          customer_loyalty_account_id?: string
          id?: string
          loyalty_reward_id?: string
          note?: string | null
          points_spent?: number
          redeemed_at?: string
          redeemed_by?: string | null
          reward_name_snapshot?: string
          tenant_id?: string
          visits_threshold_snapshot?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_reward_redemptions_customer_loyalty_account_id_fkey"
            columns: ["customer_loyalty_account_id"]
            isOneToOne: false
            referencedRelation: "customer_loyalty_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_reward_redemptions_loyalty_reward_id_fkey"
            columns: ["loyalty_reward_id"]
            isOneToOne: false
            referencedRelation: "loyalty_rewards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_reward_redemptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      location_business_hours: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean
          location_id: string
          sort_order: number
          start_time: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_active?: boolean
          location_id: string
          sort_order?: number
          start_time: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean
          location_id?: string
          sort_order?: number
          start_time?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_business_hours_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_business_hours_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      location_exception_periods: {
        Row: {
          created_at: string
          end_time: string
          exception_id: string
          id: string
          sort_order: number
          start_time: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_time: string
          exception_id: string
          id?: string
          sort_order?: number
          start_time: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_time?: string
          exception_id?: string
          id?: string
          sort_order?: number
          start_time?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_exception_periods_exception_id_fkey"
            columns: ["exception_id"]
            isOneToOne: false
            referencedRelation: "location_schedule_exceptions_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_exception_periods_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      location_schedule_exceptions: {
        Row: {
          closes_at: string | null
          created_at: string
          created_by: string
          exception_date: string
          id: string
          is_closed: boolean
          location_id: string
          name: string
          notes: string | null
          opens_at: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          closes_at?: string | null
          created_at?: string
          created_by: string
          exception_date: string
          id?: string
          is_closed?: boolean
          location_id: string
          name: string
          notes?: string | null
          opens_at?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          closes_at?: string | null
          created_at?: string
          created_by?: string
          exception_date?: string
          id?: string
          is_closed?: boolean
          location_id?: string
          name?: string
          notes?: string | null
          opens_at?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_schedule_exceptions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_schedule_exceptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      location_schedule_exceptions_v2: {
        Row: {
          created_at: string
          exception_date: string
          exception_type: string
          id: string
          is_active: boolean
          location_id: string
          notes: string | null
          tenant_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          exception_date: string
          exception_type: string
          id?: string
          is_active?: boolean
          location_id: string
          notes?: string | null
          tenant_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          exception_date?: string
          exception_type?: string
          id?: string
          is_active?: boolean
          location_id?: string
          notes?: string | null
          tenant_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_schedule_exceptions_v2_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_schedule_exceptions_v2_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      location_working_hours: {
        Row: {
          closes_at: string | null
          created_at: string
          day_of_week: number
          id: string
          is_closed: boolean
          location_id: string
          opens_at: string | null
          updated_at: string
        }
        Insert: {
          closes_at?: string | null
          created_at?: string
          day_of_week: number
          id?: string
          is_closed?: boolean
          location_id: string
          opens_at?: string | null
          updated_at?: string
        }
        Update: {
          closes_at?: string | null
          created_at?: string
          day_of_week?: number
          id?: string
          is_closed?: boolean
          location_id?: string
          opens_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_working_hours_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          description: string | null
          email: string | null
          id: string
          is_active: boolean
          is_primary: boolean
          latitude: number | null
          location_type: string
          longitude: number | null
          name: string
          phone_number: string | null
          postal_code: string | null
          province_state: string | null
          slug: string
          sort_order: number
          street_address: string | null
          tenant_id: string
          timezone: string
          updated_at: string
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          is_primary?: boolean
          latitude?: number | null
          location_type?: string
          longitude?: number | null
          name: string
          phone_number?: string | null
          postal_code?: string | null
          province_state?: string | null
          slug: string
          sort_order?: number
          street_address?: string | null
          tenant_id: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          is_primary?: boolean
          latitude?: number | null
          location_type?: string
          longitude?: number | null
          name?: string
          phone_number?: string | null
          postal_code?: string | null
          province_state?: string | null
          slug?: string
          sort_order?: number
          street_address?: string | null
          tenant_id?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_rewards: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          points_required: number | null
          reward_type: string
          sort_order: number
          tenant_id: string
          updated_at: string
          visits_required: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          points_required?: number | null
          reward_type: string
          sort_order?: number
          tenant_id: string
          updated_at?: string
          visits_required?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          points_required?: number | null
          reward_type?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
          visits_required?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_rewards_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          alt_text: string | null
          caption: string | null
          created_at: string
          created_by: string
          height: number | null
          id: string
          is_primary: boolean
          location_id: string | null
          media_role: string
          mime_type: string
          original_filename: string | null
          resource_id: string | null
          size_bytes: number
          sort_order: number
          storage_bucket: string
          storage_path: string
          tenant_id: string
          updated_at: string
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          caption?: string | null
          created_at?: string
          created_by: string
          height?: number | null
          id?: string
          is_primary?: boolean
          location_id?: string | null
          media_role: string
          mime_type: string
          original_filename?: string | null
          resource_id?: string | null
          size_bytes: number
          sort_order?: number
          storage_bucket?: string
          storage_path: string
          tenant_id: string
          updated_at?: string
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          caption?: string | null
          created_at?: string
          created_by?: string
          height?: number | null
          id?: string
          is_primary?: boolean
          location_id?: string | null
          media_role?: string
          mime_type?: string
          original_filename?: string | null
          resource_id?: string | null
          size_bytes?: number
          sort_order?: number
          storage_bucket?: string
          storage_path?: string
          tenant_id?: string
          updated_at?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_assets_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_assets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_deliveries: {
        Row: {
          attempt_number: number
          completed_at: string | null
          created_at: string
          error_code: string | null
          error_message: string | null
          id: string
          outbox_id: string
          provider: string
          provider_message_id: string | null
          response_metadata: Json | null
          started_at: string
          status: string
          tenant_id: string
        }
        Insert: {
          attempt_number: number
          completed_at?: string | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          outbox_id: string
          provider: string
          provider_message_id?: string | null
          response_metadata?: Json | null
          started_at?: string
          status: string
          tenant_id: string
        }
        Update: {
          attempt_number?: number
          completed_at?: string | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          outbox_id?: string
          provider?: string
          provider_message_id?: string | null
          response_metadata?: Json | null
          started_at?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_deliveries_outbox_id_fkey"
            columns: ["outbox_id"]
            isOneToOne: false
            referencedRelation: "notification_outbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_deliveries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_outbox: {
        Row: {
          appointment_id: string
          attempt_count: number
          channel: string
          created_at: string
          event_type: string
          id: string
          idempotency_key: string
          last_error_code: string | null
          last_error_message: string | null
          locked_at: string | null
          locked_by: string | null
          next_attempt_at: string
          payload: Json
          processed_at: string | null
          recipient_email: string
          rendered_html: string | null
          rendered_subject: string | null
          rendered_text: string | null
          reply_to_email: string | null
          sender_name: string | null
          status: string
          template_type: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          appointment_id: string
          attempt_count?: number
          channel?: string
          created_at?: string
          event_type: string
          id?: string
          idempotency_key: string
          last_error_code?: string | null
          last_error_message?: string | null
          locked_at?: string | null
          locked_by?: string | null
          next_attempt_at?: string
          payload: Json
          processed_at?: string | null
          recipient_email: string
          rendered_html?: string | null
          rendered_subject?: string | null
          rendered_text?: string | null
          reply_to_email?: string | null
          sender_name?: string | null
          status?: string
          template_type: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string
          attempt_count?: number
          channel?: string
          created_at?: string
          event_type?: string
          id?: string
          idempotency_key?: string
          last_error_code?: string | null
          last_error_message?: string | null
          locked_at?: string | null
          locked_by?: string | null
          next_attempt_at?: string
          payload?: Json
          processed_at?: string | null
          recipient_email?: string
          rendered_html?: string | null
          rendered_subject?: string | null
          rendered_text?: string | null
          reply_to_email?: string | null
          sender_name?: string | null
          status?: string
          template_type?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_outbox_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_outbox_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          body_template: string
          created_at: string
          id: string
          is_active: boolean
          subject_template: string
          template_type: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          body_template: string
          created_at?: string
          id?: string
          is_active?: boolean
          subject_template: string
          template_type: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          body_template?: string
          created_at?: string
          id?: string
          is_active?: boolean
          subject_template?: string
          template_type?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_intents: {
        Row: {
          amount: number
          appointment_id: string
          appointment_payment_id: string
          checkout_url: string | null
          completed_at: string | null
          created_at: string
          currency: string
          expires_at: string | null
          failure_code: string | null
          failure_message: string | null
          id: string
          metadata: Json
          provider: string
          provider_checkout_id: string | null
          provider_order_id: string | null
          provider_payment_id: string | null
          request_key: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          appointment_id: string
          appointment_payment_id: string
          checkout_url?: string | null
          completed_at?: string | null
          created_at?: string
          currency: string
          expires_at?: string | null
          failure_code?: string | null
          failure_message?: string | null
          id?: string
          metadata?: Json
          provider: string
          provider_checkout_id?: string | null
          provider_order_id?: string | null
          provider_payment_id?: string | null
          request_key: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          appointment_id?: string
          appointment_payment_id?: string
          checkout_url?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          expires_at?: string | null
          failure_code?: string | null
          failure_message?: string | null
          id?: string
          metadata?: Json
          provider?: string
          provider_checkout_id?: string | null
          provider_order_id?: string | null
          provider_payment_id?: string | null
          request_key?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_intents_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_intents_appointment_payment_id_fkey"
            columns: ["appointment_payment_id"]
            isOneToOne: false
            referencedRelation: "appointment_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_intents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admins: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      public_booking_requests: {
        Row: {
          appointment_id: string | null
          completed_at: string | null
          created_at: string
          id: string
          idempotency_key: string
          request_hash: string
          status: string
          tenant_id: string
        }
        Insert: {
          appointment_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          idempotency_key: string
          request_hash: string
          status?: string
          tenant_id: string
        }
        Update: {
          appointment_id?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string
          request_hash?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_booking_requests_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_booking_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_locations: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          is_primary: boolean
          location_id: string
          resource_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_primary?: boolean
          location_id: string
          resource_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_primary?: boolean
          location_id?: string
          resource_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_locations_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_time_off: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          is_active: boolean
          is_all_day: boolean
          location_id: string | null
          notes: string | null
          resource_id: string
          starts_at: string
          tenant_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          is_active?: boolean
          is_all_day?: boolean
          location_id?: string | null
          notes?: string | null
          resource_id: string
          starts_at: string
          tenant_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          is_active?: boolean
          is_all_day?: boolean
          location_id?: string | null
          notes?: string | null
          resource_id?: string
          starts_at?: string
          tenant_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_time_off_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_time_off_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_time_off_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_types: {
        Row: {
          created_at: string
          description: string | null
          display_name_plural: string
          display_name_singular: string
          id: string
          is_active: boolean
          name: string
          resource_kind: string
          slug: string
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_name_plural: string
          display_name_singular: string
          id?: string
          is_active?: boolean
          name: string
          resource_kind: string
          slug: string
          sort_order?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_name_plural?: string
          display_name_singular?: string
          id?: string
          is_active?: boolean
          name?: string
          resource_kind?: string
          slug?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_types_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_working_hours: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean
          location_id: string | null
          resource_id: string
          sort_order: number
          start_time: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_active?: boolean
          location_id?: string | null
          resource_id: string
          sort_order?: number
          start_time: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean
          location_id?: string | null
          resource_id?: string
          sort_order?: number
          start_time?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_working_hours_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_working_hours_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_working_hours_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          created_at: string
          description: string | null
          email: string | null
          id: string
          is_active: boolean
          name: string
          phone_number: string | null
          resource_type_id: string
          slug: string
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          phone_number?: string | null
          resource_type_id: string
          slug: string
          sort_order?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          phone_number?: string | null
          resource_type_id?: string
          slug?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_resource_type_id_fkey"
            columns: ["resource_type_id"]
            isOneToOne: false
            referencedRelation: "resource_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_booking_rules: {
        Row: {
          allow_customer_cancellation: boolean | null
          allow_customer_rescheduling: boolean | null
          allow_same_day_booking: boolean | null
          cancellation_notice_minutes: number | null
          created_at: string
          id: string
          is_active: boolean
          maximum_advance_days: number | null
          minimum_notice_minutes: number | null
          require_customer_email: boolean | null
          require_customer_phone: boolean | null
          reschedule_notice_minutes: number | null
          service_id: string
          slot_interval_minutes: number | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          allow_customer_cancellation?: boolean | null
          allow_customer_rescheduling?: boolean | null
          allow_same_day_booking?: boolean | null
          cancellation_notice_minutes?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          maximum_advance_days?: number | null
          minimum_notice_minutes?: number | null
          require_customer_email?: boolean | null
          require_customer_phone?: boolean | null
          reschedule_notice_minutes?: number | null
          service_id: string
          slot_interval_minutes?: number | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          allow_customer_cancellation?: boolean | null
          allow_customer_rescheduling?: boolean | null
          allow_same_day_booking?: boolean | null
          cancellation_notice_minutes?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          maximum_advance_days?: number | null
          minimum_notice_minutes?: number | null
          require_customer_email?: boolean | null
          require_customer_phone?: boolean | null
          reschedule_notice_minutes?: number | null
          service_id?: string
          slot_interval_minutes?: number | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_booking_rules_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_booking_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_locations: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          location_id: string
          service_id: string
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          location_id: string
          service_id: string
          sort_order?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          location_id?: string
          service_id?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_locations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_locations_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_package_services: {
        Row: {
          created_at: string
          credits_required: number
          id: string
          package_id: string
          service_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          credits_required?: number
          id?: string
          package_id: string
          service_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          credits_required?: number
          id?: string
          package_id?: string
          service_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_package_services_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "service_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_package_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_package_services_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_packages: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_public: boolean
          name: string
          sort_order: number
          tenant_id: string
          total_credits: number
          updated_at: string
          validity_days: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_public?: boolean
          name: string
          sort_order?: number
          tenant_id: string
          total_credits: number
          updated_at?: string
          validity_days?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_public?: boolean
          name?: string
          sort_order?: number
          tenant_id?: string
          total_credits?: number
          updated_at?: string
          validity_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "service_packages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      service_resources: {
        Row: {
          buffer_after_override_minutes: number | null
          buffer_before_override_minutes: number | null
          created_at: string
          currency_override: string | null
          duration_override_minutes: number | null
          id: string
          is_active: boolean
          price_override: number | null
          resource_id: string
          service_id: string
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          buffer_after_override_minutes?: number | null
          buffer_before_override_minutes?: number | null
          created_at?: string
          currency_override?: string | null
          duration_override_minutes?: number | null
          id?: string
          is_active?: boolean
          price_override?: number | null
          resource_id: string
          service_id: string
          sort_order?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          buffer_after_override_minutes?: number | null
          buffer_before_override_minutes?: number | null
          created_at?: string
          currency_override?: string | null
          duration_override_minutes?: number | null
          id?: string
          is_active?: boolean
          price_override?: number | null
          resource_id?: string
          service_id?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_resources_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_resources_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_resources_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          buffer_after_minutes: number
          buffer_before_minutes: number
          created_at: string
          currency: string
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          name: string
          price: number
          service_category_id: string | null
          slug: string
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          buffer_after_minutes?: number
          buffer_before_minutes?: number
          created_at?: string
          currency: string
          description?: string | null
          duration_minutes: number
          id?: string
          is_active?: boolean
          name: string
          price?: number
          service_category_id?: string | null
          slug: string
          sort_order?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          buffer_after_minutes?: number
          buffer_before_minutes?: number
          created_at?: string
          currency?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          service_category_id?: string | null
          slug?: string
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_service_category_id_fkey"
            columns: ["service_category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_events: {
        Row: {
          created_at: string
          event_type: string
          external_event_id: string | null
          id: string
          payload: Json
          payment_provider: string | null
          processed_at: string | null
          subscription_id: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          external_event_id?: string | null
          id?: string
          payload?: Json
          payment_provider?: string | null
          processed_at?: string | null
          subscription_id?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          external_event_id?: string | null
          id?: string
          payload?: Json
          payment_provider?: string | null
          processed_at?: string | null
          subscription_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_events_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "tenant_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          billing_interval: string
          code: string
          created_at: string
          currency: string
          description: string | null
          external_price_id: string | null
          external_product_id: string | null
          features: Json
          id: string
          is_active: boolean
          name: string
          price_amount: number
          updated_at: string
        }
        Insert: {
          billing_interval?: string
          code: string
          created_at?: string
          currency?: string
          description?: string | null
          external_price_id?: string | null
          external_product_id?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          name: string
          price_amount?: number
          updated_at?: string
        }
        Update: {
          billing_interval?: string
          code?: string
          created_at?: string
          currency?: string
          description?: string | null
          external_price_id?: string | null
          external_product_id?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          name?: string
          price_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      tenant_billing_customers: {
        Row: {
          created_at: string
          customer_metadata: Json
          customer_type: string | null
          email: string | null
          external_id: string
          id: string
          is_deleted: boolean
          last_event_at: string | null
          last_synced_at: string
          name: string | null
          polar_created_at: string | null
          polar_customer_id: string
          polar_modified_at: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_metadata?: Json
          customer_type?: string | null
          email?: string | null
          external_id: string
          id?: string
          is_deleted?: boolean
          last_event_at?: string | null
          last_synced_at?: string
          name?: string | null
          polar_created_at?: string | null
          polar_customer_id: string
          polar_modified_at?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_metadata?: Json
          customer_type?: string | null
          email?: string | null
          external_id?: string
          id?: string
          is_deleted?: boolean
          last_event_at?: string | null
          last_synced_at?: string
          name?: string | null
          polar_created_at?: string | null
          polar_customer_id?: string
          polar_modified_at?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_billing_customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_booking_rules: {
        Row: {
          allow_customer_cancellation: boolean
          allow_customer_rescheduling: boolean
          allow_same_day_booking: boolean
          cancellation_notice_minutes: number
          created_at: string
          id: string
          is_active: boolean
          maximum_advance_days: number
          minimum_notice_minutes: number
          require_customer_email: boolean
          require_customer_phone: boolean
          reschedule_notice_minutes: number
          slot_interval_minutes: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          allow_customer_cancellation?: boolean
          allow_customer_rescheduling?: boolean
          allow_same_day_booking?: boolean
          cancellation_notice_minutes?: number
          created_at?: string
          id?: string
          is_active?: boolean
          maximum_advance_days?: number
          minimum_notice_minutes?: number
          require_customer_email?: boolean
          require_customer_phone?: boolean
          reschedule_notice_minutes?: number
          slot_interval_minutes?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          allow_customer_cancellation?: boolean
          allow_customer_rescheduling?: boolean
          allow_same_day_booking?: boolean
          cancellation_notice_minutes?: number
          created_at?: string
          id?: string
          is_active?: boolean
          maximum_advance_days?: number
          minimum_notice_minutes?: number
          require_customer_email?: boolean
          require_customer_phone?: boolean
          reschedule_notice_minutes?: number
          slot_interval_minutes?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_booking_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_customer_private: {
        Row: {
          blocked_reason: string | null
          created_at: string
          custom_data: Json
          id: string
          internal_notes: string | null
          is_blocked: boolean
          loyalty_points: number
          tenant_customer_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          blocked_reason?: string | null
          created_at?: string
          custom_data?: Json
          id?: string
          internal_notes?: string | null
          is_blocked?: boolean
          loyalty_points?: number
          tenant_customer_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          blocked_reason?: string | null
          created_at?: string
          custom_data?: Json
          id?: string
          internal_notes?: string | null
          is_blocked?: boolean
          loyalty_points?: number
          tenant_customer_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_customer_private_tenant_customer_id_fkey"
            columns: ["tenant_customer_id"]
            isOneToOne: true
            referencedRelation: "tenant_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_customer_private_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_customers: {
        Row: {
          created_at: string
          email: string | null
          id: string
          marketing_opt_in: boolean
          marketing_opt_in_at: string | null
          name: string
          phone_number: string | null
          preferred_location_id: string | null
          tenant_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          marketing_opt_in?: boolean
          marketing_opt_in_at?: string | null
          name: string
          phone_number?: string | null
          preferred_location_id?: string | null
          tenant_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          marketing_opt_in?: boolean
          marketing_opt_in_at?: string | null
          name?: string
          phone_number?: string | null
          preferred_location_id?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_customers_preferred_location_fk"
            columns: ["preferred_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_loyalty_settings: {
        Row: {
          allow_manual_adjustments: boolean
          count_completed_visits: boolean
          created_at: string
          id: string
          is_enabled: boolean
          points_per_completed_appointment: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          allow_manual_adjustments?: boolean
          count_completed_visits?: boolean
          created_at?: string
          id?: string
          is_enabled?: boolean
          points_per_completed_appointment?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          allow_manual_adjustments?: boolean
          count_completed_visits?: boolean
          created_at?: string
          id?: string
          is_enabled?: boolean
          points_per_completed_appointment?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_loyalty_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_members: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          role: string
          status: string
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          role?: string
          status?: string
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          role?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_notification_settings: {
        Row: {
          created_at: string
          email_notifications_enabled: boolean
          id: string
          reply_to_email: string | null
          review_request_delay_minutes: number
          review_requests_enabled: boolean
          send_booking_confirmation: boolean
          send_cancellation_confirmation: boolean
          send_reschedule_confirmation: boolean
          sender_name: string | null
          show_public_reviews: boolean
          tenant_id: string
          updated_at: string
          waitlist_enabled: boolean
          waitlist_max_date_range_days: number
          waitlist_notify_batch_size: number
          waitlist_offer_expiry_minutes: number
        }
        Insert: {
          created_at?: string
          email_notifications_enabled?: boolean
          id?: string
          reply_to_email?: string | null
          review_request_delay_minutes?: number
          review_requests_enabled?: boolean
          send_booking_confirmation?: boolean
          send_cancellation_confirmation?: boolean
          send_reschedule_confirmation?: boolean
          sender_name?: string | null
          show_public_reviews?: boolean
          tenant_id: string
          updated_at?: string
          waitlist_enabled?: boolean
          waitlist_max_date_range_days?: number
          waitlist_notify_batch_size?: number
          waitlist_offer_expiry_minutes?: number
        }
        Update: {
          created_at?: string
          email_notifications_enabled?: boolean
          id?: string
          reply_to_email?: string | null
          review_request_delay_minutes?: number
          review_requests_enabled?: boolean
          send_booking_confirmation?: boolean
          send_cancellation_confirmation?: boolean
          send_reschedule_confirmation?: boolean
          sender_name?: string | null
          show_public_reviews?: boolean
          tenant_id?: string
          updated_at?: string
          waitlist_enabled?: boolean
          waitlist_max_date_range_days?: number
          waitlist_notify_batch_size?: number
          waitlist_offer_expiry_minutes?: number
        }
        Relationships: [
          {
            foreignKeyName: "tenant_notification_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_onboarding: {
        Row: {
          completed_at: string | null
          created_at: string
          current_step: string
          id: string
          last_activity_at: string
          metadata: Json
          skipped_steps: Json
          started_at: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_step?: string
          id?: string
          last_activity_at?: string
          metadata?: Json
          skipped_steps?: Json
          started_at?: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_step?: string
          id?: string
          last_activity_at?: string
          metadata?: Json
          skipped_steps?: Json
          started_at?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_onboarding_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_public_booking_settings: {
        Row: {
          allow_no_preference: boolean
          allow_resource_selection: boolean
          booking_page_description: string | null
          booking_page_title: string | null
          confirmation_message: string | null
          created_at: string
          id: string
          is_enabled: boolean
          show_resource_names: boolean
          show_service_duration: boolean
          show_service_prices: boolean
          tenant_id: string
          updated_at: string
        }
        Insert: {
          allow_no_preference?: boolean
          allow_resource_selection?: boolean
          booking_page_description?: string | null
          booking_page_title?: string | null
          confirmation_message?: string | null
          created_at?: string
          id?: string
          is_enabled?: boolean
          show_resource_names?: boolean
          show_service_duration?: boolean
          show_service_prices?: boolean
          tenant_id: string
          updated_at?: string
        }
        Update: {
          allow_no_preference?: boolean
          allow_resource_selection?: boolean
          booking_page_description?: string | null
          booking_page_title?: string | null
          confirmation_message?: string | null
          created_at?: string
          id?: string
          is_enabled?: boolean
          show_resource_names?: boolean
          show_service_duration?: boolean
          show_service_prices?: boolean
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_public_booking_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_reminder_rules: {
        Row: {
          channel: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          offset_minutes: number
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          channel?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          offset_minutes: number
          sort_order?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          offset_minutes?: number
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_reminder_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_subscriptions: {
        Row: {
          access_state: string
          amount: number | null
          billing_interval: string | null
          billing_interval_count: number | null
          billing_plan_id: string | null
          billing_plan_price_id: string | null
          cancel_at_period_end: boolean
          canceled_at: string | null
          cancelled_at: string | null
          created_at: string
          currency: string | null
          current_period_ends_at: string | null
          current_period_start: string | null
          current_period_started_at: string | null
          customer_cancellation_comment: string | null
          customer_cancellation_reason: string | null
          ended_at: string | null
          ends_at: string | null
          external_customer_id: string | null
          external_subscription_id: string | null
          id: string
          last_event_at: string | null
          last_event_id: string | null
          last_synced_at: string | null
          metadata: Json
          payment_provider: string | null
          plan_id: string | null
          polar_checkout_id: string | null
          polar_created_at: string | null
          polar_customer_id: string | null
          polar_modified_at: string | null
          polar_price_id: string | null
          polar_product_id: string | null
          polar_subscription_id: string | null
          quantity: number | null
          started_at: string | null
          status: string
          subscription_metadata: Json | null
          sync_error_code: string | null
          sync_error_message: string | null
          sync_status: string
          tenant_billing_customer_id: string | null
          tenant_id: string
          trial_ends_at: string | null
          trial_start: string | null
          trial_start_at: string | null
          trial_started_at: string | null
          updated_at: string
        }
        Insert: {
          access_state?: string
          amount?: number | null
          billing_interval?: string | null
          billing_interval_count?: number | null
          billing_plan_id?: string | null
          billing_plan_price_id?: string | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          cancelled_at?: string | null
          created_at?: string
          currency?: string | null
          current_period_ends_at?: string | null
          current_period_start?: string | null
          current_period_started_at?: string | null
          customer_cancellation_comment?: string | null
          customer_cancellation_reason?: string | null
          ended_at?: string | null
          ends_at?: string | null
          external_customer_id?: string | null
          external_subscription_id?: string | null
          id?: string
          last_event_at?: string | null
          last_event_id?: string | null
          last_synced_at?: string | null
          metadata?: Json
          payment_provider?: string | null
          plan_id?: string | null
          polar_checkout_id?: string | null
          polar_created_at?: string | null
          polar_customer_id?: string | null
          polar_modified_at?: string | null
          polar_price_id?: string | null
          polar_product_id?: string | null
          polar_subscription_id?: string | null
          quantity?: number | null
          started_at?: string | null
          status?: string
          subscription_metadata?: Json | null
          sync_error_code?: string | null
          sync_error_message?: string | null
          sync_status?: string
          tenant_billing_customer_id?: string | null
          tenant_id: string
          trial_ends_at?: string | null
          trial_start?: string | null
          trial_start_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
        }
        Update: {
          access_state?: string
          amount?: number | null
          billing_interval?: string | null
          billing_interval_count?: number | null
          billing_plan_id?: string | null
          billing_plan_price_id?: string | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          cancelled_at?: string | null
          created_at?: string
          currency?: string | null
          current_period_ends_at?: string | null
          current_period_start?: string | null
          current_period_started_at?: string | null
          customer_cancellation_comment?: string | null
          customer_cancellation_reason?: string | null
          ended_at?: string | null
          ends_at?: string | null
          external_customer_id?: string | null
          external_subscription_id?: string | null
          id?: string
          last_event_at?: string | null
          last_event_id?: string | null
          last_synced_at?: string | null
          metadata?: Json
          payment_provider?: string | null
          plan_id?: string | null
          polar_checkout_id?: string | null
          polar_created_at?: string | null
          polar_customer_id?: string | null
          polar_modified_at?: string | null
          polar_price_id?: string | null
          polar_product_id?: string | null
          polar_subscription_id?: string | null
          quantity?: number | null
          started_at?: string | null
          status?: string
          subscription_metadata?: Json | null
          sync_error_code?: string | null
          sync_error_message?: string | null
          sync_status?: string
          tenant_billing_customer_id?: string | null
          tenant_id?: string
          trial_ends_at?: string | null
          trial_start?: string | null
          trial_start_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          default_currency: string
          default_language: string
          default_timezone: string
          description: string | null
          id: string
          logo_path: string | null
          name: string
          slug: string
          social_links: Json
          status: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          default_currency?: string
          default_language?: string
          default_timezone?: string
          description?: string | null
          id?: string
          logo_path?: string | null
          name: string
          slug: string
          social_links?: Json
          status?: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          default_currency?: string
          default_language?: string
          default_timezone?: string
          description?: string | null
          id?: string
          logo_path?: string | null
          name?: string
          slug?: string
          social_links?: Json
          status?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      waitlist_entries: {
        Row: {
          allow_any_resource: boolean
          created_at: string
          customer_email: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          expires_at: string | null
          id: string
          location_id: string
          notes: string | null
          preferred_date_from: string
          preferred_date_to: string
          preferred_time_from: string | null
          preferred_time_to: string | null
          resource_id: string | null
          service_id: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          allow_any_resource?: boolean
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          expires_at?: string | null
          id?: string
          location_id: string
          notes?: string | null
          preferred_date_from: string
          preferred_date_to: string
          preferred_time_from?: string | null
          preferred_time_to?: string | null
          resource_id?: string | null
          service_id: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          allow_any_resource?: boolean
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          expires_at?: string | null
          id?: string
          location_id?: string
          notes?: string | null
          preferred_date_from?: string
          preferred_date_to?: string
          preferred_time_from?: string | null
          preferred_time_to?: string | null
          resource_id?: string | null
          service_id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_entries_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_entries_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_entries_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist_offers: {
        Row: {
          created_at: string
          ends_at: string
          expires_at: string
          id: string
          location_id: string
          notification_outbox_id: string | null
          resource_id: string
          service_id: string
          starts_at: string
          status: string
          tenant_id: string
          token_hash: string | null
          token_prefix: string | null
          updated_at: string
          waitlist_entry_id: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          expires_at: string
          id?: string
          location_id: string
          notification_outbox_id?: string | null
          resource_id: string
          service_id: string
          starts_at: string
          status?: string
          tenant_id: string
          token_hash?: string | null
          token_prefix?: string | null
          updated_at?: string
          waitlist_entry_id: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          expires_at?: string
          id?: string
          location_id?: string
          notification_outbox_id?: string | null
          resource_id?: string
          service_id?: string
          starts_at?: string
          status?: string
          tenant_id?: string
          token_hash?: string | null
          token_prefix?: string | null
          updated_at?: string
          waitlist_entry_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_offers_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_offers_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_offers_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_offers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_offers_waitlist_entry_id_fkey"
            columns: ["waitlist_entry_id"]
            isOneToOne: false
            referencedRelation: "waitlist_entries"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_appointment_payment_order_paid: {
        Args: {
          p_paid_amount?: number
          p_paid_currency?: string
          p_payment_intent_id: string
          p_provider_event_id?: string
          p_provider_order_id: string
          p_provider_payment_id?: string
        }
        Returns: Json
      }
      award_customer_loyalty_points: {
        Args: {
          p_appointment_id: string
          p_count_visit?: boolean
          p_customer_id: string
          p_idempotency_key?: string
          p_points: number
          p_tenant_id: string
        }
        Returns: {
          completed_visit_count: number
          created_at: string
          customer_id: string
          id: string
          last_earned_at: string | null
          lifetime_points_earned: number
          points_balance: number
          tenant_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "customer_loyalty_accounts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      backfill_appointment_reminders: {
        Args: {
          p_batch_limit?: number
          p_end_at: string
          p_start_at: string
          p_tenant_id: string
        }
        Returns: Json
      }
      cancel_appointment: {
        Args: {
          p_appointment_id: string
          p_cancelled_by?: string
          p_reason?: string
          p_tenant_id: string
        }
        Returns: {
          appointment_number: string
          buffer_after_minutes: number
          buffer_before_minutes: number
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          checked_in_at: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          currency: string
          customer_email: string | null
          customer_id: string | null
          customer_name: string
          customer_notes: string | null
          customer_package_id: string | null
          customer_package_usage_id: string | null
          customer_phone: string | null
          duration_minutes: number
          ends_at: string
          id: string
          internal_notes: string | null
          location_id: string
          location_name_snapshot: string
          no_show_at: string | null
          occupied_ends_at: string
          occupied_starts_at: string
          package_credits_used: number | null
          package_name_snapshot: string | null
          price: number
          resource_id: string
          resource_name_snapshot: string
          schedule_version: number
          service_id: string
          service_name_snapshot: string
          service_started_at: string | null
          source: string
          starts_at: string
          status: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "appointments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_pending_appointment_reminder_notifications: {
        Args: {
          p_appointment_id: string
          p_reason?: string
          p_tenant_id: string
        }
        Returns: number
      }
      claim_billing_webhook_events: {
        Args: { p_batch_size?: number; p_worker_id: string }
        Returns: {
          attempt_count: number
          created_at: string
          event_timestamp: string
          event_type: string
          id: string
          ignored_at: string | null
          last_error_code: string | null
          last_error_message: string | null
          next_attempt_at: string
          organization_id: string | null
          payload: Json
          payload_hash: string
          polar_event_id: string
          processed_at: string | null
          processing_started_at: string | null
          processing_worker_id: string | null
          resource_id: string | null
          status: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "billing_webhook_events"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_due_appointment_reminders: {
        Args: { p_batch_size?: number; p_worker_id: string }
        Returns: {
          appointment_id: string
          cancellation_reason: string | null
          cancelled_at: string | null
          channel: string
          claimed_at: string | null
          claimed_by: string | null
          created_at: string
          enqueued_at: string | null
          id: string
          outbox_id: string | null
          reminder_rule_id: string
          schedule_version: number
          scheduled_for: string
          sent_at: string | null
          status: string
          tenant_id: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "appointment_reminders"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_notification_outbox_batch: {
        Args: { p_batch_size?: number; p_worker_id: string }
        Returns: {
          appointment_id: string
          attempt_count: number
          channel: string
          created_at: string
          event_type: string
          id: string
          idempotency_key: string
          last_error_code: string | null
          last_error_message: string | null
          locked_at: string | null
          locked_by: string | null
          next_attempt_at: string
          payload: Json
          processed_at: string | null
          recipient_email: string
          rendered_html: string | null
          rendered_subject: string | null
          rendered_text: string | null
          reply_to_email: string | null
          sender_name: string | null
          status: string
          template_type: string
          tenant_id: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "notification_outbox"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_public_booking_request: {
        Args: {
          p_idempotency_key: string
          p_request_hash: string
          p_tenant_id: string
        }
        Returns: {
          appointment_id: string | null
          completed_at: string | null
          created_at: string
          id: string
          idempotency_key: string
          request_hash: string
          status: string
          tenant_id: string
        }
        SetofOptions: {
          from: "*"
          to: "public_booking_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      complete_public_booking_request: {
        Args: {
          p_appointment_id: string
          p_idempotency_key: string
          p_status?: string
          p_tenant_id: string
        }
        Returns: undefined
      }
      consume_customer_package_usage: {
        Args: { p_tenant_id: string; p_usage_id: string }
        Returns: undefined
      }
      create_location_exception_v2: {
        Args: {
          p_exception_date: string
          p_exception_type: string
          p_is_active?: boolean
          p_location_id: string
          p_notes?: string
          p_periods?: Json
          p_tenant_id: string
          p_title?: string
        }
        Returns: string
      }
      create_location_schedule_exception: {
        Args: {
          p_closes_at?: string
          p_exception_date: string
          p_is_closed: boolean
          p_name: string
          p_notes?: string
          p_opens_at?: string
          target_location_id: string
          target_tenant_id: string
        }
        Returns: string
      }
      create_resource_time_off: {
        Args: {
          p_ends_at?: string
          p_is_all_day?: boolean
          p_location_id?: string
          p_notes?: string
          p_resource_id: string
          p_starts_at?: string
          p_tenant_id: string
          p_title?: string
        }
        Returns: string
      }
      create_resource_with_locations: {
        Args: {
          p_description?: string
          p_email?: string
          p_is_active?: boolean
          p_location_ids?: string[]
          p_name: string
          p_phone_number?: string
          p_primary_location_id?: string
          p_resource_type_id: string
          p_slug: string
          p_tenant_id: string
        }
        Returns: string
      }
      create_service_with_assignments: {
        Args: {
          p_buffer_after_minutes?: number
          p_buffer_before_minutes?: number
          p_currency?: string
          p_description?: string
          p_duration_minutes?: number
          p_is_active?: boolean
          p_location_ids?: string[]
          p_name?: string
          p_price?: number
          p_resource_assignments?: Json
          p_service_category_id?: string
          p_slug?: string
          p_sort_order?: number
          p_tenant_id: string
        }
        Returns: string
      }
      create_tenant: {
        Args: {
          currency_code?: string
          primary_location_name?: string
          primary_location_slug?: string
          subscription_plan_id?: string
          tenant_name: string
          tenant_slug: string
          timezone_name?: string
          trial_days?: number
        }
        Returns: string
      }
      delete_business_location: {
        Args: { target_location_id: string; target_tenant_id: string }
        Returns: boolean
      }
      delete_business_resource: {
        Args: { p_resource_id: string; p_tenant_id: string }
        Returns: boolean
      }
      delete_location_exception_v2: {
        Args: { p_exception_id: string; p_tenant_id: string }
        Returns: boolean
      }
      delete_location_schedule_exception: {
        Args: { target_exception_id: string; target_tenant_id: string }
        Returns: boolean
      }
      delete_resource_time_off: {
        Args: { p_tenant_id: string; p_time_off_id: string }
        Returns: boolean
      }
      delete_resource_type: {
        Args: { p_resource_type_id: string; p_tenant_id: string }
        Returns: boolean
      }
      enqueue_appointment_notification: {
        Args: {
          p_appointment_id: string
          p_event_type: string
          p_idempotency_key: string
          p_payload: Json
          p_recipient_email: string
          p_rendered_html?: string
          p_rendered_subject?: string
          p_rendered_text?: string
          p_reply_to_email?: string
          p_sender_name?: string
          p_tenant_id: string
        }
        Returns: Json
      }
      expire_appointment_payment_intent: {
        Args: { p_payment_intent_id: string }
        Returns: Json
      }
      generate_appointment_number: {
        Args: { p_tenant_id: string }
        Returns: string
      }
      get_customers_with_upcoming_flag: {
        Args: { p_customer_ids: string[]; p_tenant_id: string }
        Returns: {
          customer_id: string
          has_upcoming: boolean
        }[]
      }
      get_dashboard_analytics_summary: {
        Args: {
          p_comp_end?: string
          p_comp_start?: string
          p_location_id?: string
          p_range_end: string
          p_range_start: string
          p_resource_id?: string
          p_tenant_id: string
        }
        Returns: Json
      }
      get_today_appointment_counts: {
        Args: {
          p_tenant_id: string
          p_today_end: string
          p_today_start: string
        }
        Returns: Json
      }
      insert_appointment_atomic: {
        Args: {
          p_buffer_after_minutes?: number
          p_buffer_before_minutes?: number
          p_created_by?: string
          p_currency?: string
          p_customer_email?: string
          p_customer_id?: string
          p_customer_name?: string
          p_customer_notes?: string
          p_customer_phone?: string
          p_duration_minutes?: number
          p_ends_at?: string
          p_internal_notes?: string
          p_location_id: string
          p_location_name_snapshot?: string
          p_occupied_ends_at?: string
          p_occupied_starts_at?: string
          p_price?: number
          p_resource_id: string
          p_resource_name_snapshot?: string
          p_service_id: string
          p_service_name_snapshot?: string
          p_source?: string
          p_starts_at?: string
          p_status?: string
          p_tenant_id: string
        }
        Returns: {
          appointment_number: string
          buffer_after_minutes: number
          buffer_before_minutes: number
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          checked_in_at: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          currency: string
          customer_email: string | null
          customer_id: string | null
          customer_name: string
          customer_notes: string | null
          customer_package_id: string | null
          customer_package_usage_id: string | null
          customer_phone: string | null
          duration_minutes: number
          ends_at: string
          id: string
          internal_notes: string | null
          location_id: string
          location_name_snapshot: string
          no_show_at: string | null
          occupied_ends_at: string
          occupied_starts_at: string
          package_credits_used: number | null
          package_name_snapshot: string | null
          price: number
          resource_id: string
          resource_name_snapshot: string
          schedule_version: number
          service_id: string
          service_name_snapshot: string
          service_started_at: string | null
          source: string
          starts_at: string
          status: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "appointments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      is_tenant_slug_available: {
        Args: { candidate_slug: string }
        Returns: boolean
      }
      mark_notification_failed: {
        Args: {
          p_error_code: string
          p_error_message: string
          p_outbox_id: string
          p_provider: string
          p_retryable?: boolean
          p_worker_id: string
        }
        Returns: undefined
      }
      mark_notification_sent: {
        Args: {
          p_outbox_id: string
          p_provider: string
          p_provider_message_id?: string
          p_worker_id: string
        }
        Returns: undefined
      }
      register_as_tenant_customer: {
        Args: {
          allow_marketing?: boolean
          customer_email?: string
          customer_name: string
          customer_phone?: string
          target_tenant_id: string
        }
        Returns: string
      }
      release_customer_package_usage: {
        Args: { p_tenant_id: string; p_usage_id: string }
        Returns: undefined
      }
      reorder_media_assets: {
        Args: { ordered_ids: string[]; target_tenant_id: string }
        Returns: boolean
      }
      reorder_service_categories: {
        Args: { ordered_category_ids: string[]; target_tenant_id: string }
        Returns: boolean
      }
      reorder_service_locations: {
        Args: {
          p_location_id: string
          p_ordered_assignment_ids: string[]
          p_tenant_id: string
        }
        Returns: boolean
      }
      reorder_service_resources: {
        Args: {
          p_ordered_assignment_ids: string[]
          p_service_id: string
          p_tenant_id: string
        }
        Returns: boolean
      }
      reorder_services: {
        Args: {
          ordered_service_ids: string[]
          target_category_id: string
          target_tenant_id: string
        }
        Returns: boolean
      }
      replace_location_working_hours: {
        Args: { hours: Json; target_location_id: string }
        Returns: boolean
      }
      reserve_customer_package_credits: {
        Args: {
          p_appointment_id: string
          p_credits_required: number
          p_customer_package_id: string
          p_service_id: string
          p_tenant_id: string
        }
        Returns: string
      }
      retry_failed_notification: {
        Args: { p_outbox_id: string; p_tenant_id: string }
        Returns: Json
      }
      rotate_appointment_access_token: {
        Args: {
          p_appointment_id: string
          p_encryption_key_version: number
          p_expires_at: string
          p_revocation_reason?: string
          p_tenant_id: string
          p_token_auth_tag: string
          p_token_ciphertext: string
          p_token_hash: string
          p_token_iv: string
          p_token_prefix: string
        }
        Returns: {
          appointment_id: string
          created_at: string
          expires_at: string
          id: string
          purpose: string
          revoked_at: string
          tenant_id: string
          token_prefix: string
          updated_at: string
        }[]
      }
      set_location_business_hours: {
        Args: { p_location_id: string; p_periods: Json; p_tenant_id: string }
        Returns: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean
          location_id: string
          sort_order: number
          start_time: string
          tenant_id: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "location_business_hours"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      set_primary_location: {
        Args: { target_location_id: string; target_tenant_id: string }
        Returns: boolean
      }
      set_primary_resource_location: {
        Args: {
          p_location_id: string
          p_resource_id: string
          p_tenant_id: string
        }
        Returns: boolean
      }
      set_resource_working_hours: {
        Args: { p_periods: Json; p_resource_id: string; p_tenant_id: string }
        Returns: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean
          location_id: string | null
          resource_id: string
          sort_order: number
          start_time: string
          tenant_id: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "resource_working_hours"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      set_service_locations: {
        Args: {
          p_location_ids: string[]
          p_service_id: string
          p_tenant_id: string
        }
        Returns: {
          created_at: string
          id: string
          is_active: boolean
          location_id: string
          service_id: string
          sort_order: number
          tenant_id: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "service_locations"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      set_service_resources: {
        Args: { p_assignments: Json; p_service_id: string; p_tenant_id: string }
        Returns: {
          buffer_after_override_minutes: number | null
          buffer_before_override_minutes: number | null
          created_at: string
          currency_override: string | null
          duration_override_minutes: number | null
          id: string
          is_active: boolean
          price_override: number | null
          resource_id: string
          service_id: string
          sort_order: number
          tenant_id: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "service_resources"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      sync_appointment_reminders: {
        Args: { p_appointment_id: string; p_tenant_id: string }
        Returns: Json
      }
      transition_appointment_status: {
        Args: {
          p_appointment_id: string
          p_target_status: string
          p_tenant_id: string
          p_updated_by?: string
        }
        Returns: {
          appointment_number: string
          buffer_after_minutes: number
          buffer_before_minutes: number
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          checked_in_at: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          currency: string
          customer_email: string | null
          customer_id: string | null
          customer_name: string
          customer_notes: string | null
          customer_package_id: string | null
          customer_package_usage_id: string | null
          customer_phone: string | null
          duration_minutes: number
          ends_at: string
          id: string
          internal_notes: string | null
          location_id: string
          location_name_snapshot: string
          no_show_at: string | null
          occupied_ends_at: string
          occupied_starts_at: string
          package_credits_used: number | null
          package_name_snapshot: string | null
          price: number
          resource_id: string
          resource_name_snapshot: string
          schedule_version: number
          service_id: string
          service_name_snapshot: string
          service_started_at: string | null
          source: string
          starts_at: string
          status: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "appointments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_location_exception_v2: {
        Args: {
          p_exception_id: string
          p_exception_type?: string
          p_is_active?: boolean
          p_notes?: string
          p_periods?: Json
          p_tenant_id: string
          p_title?: string
        }
        Returns: boolean
      }
      update_location_schedule_exception: {
        Args: {
          p_closes_at?: string
          p_exception_date: string
          p_is_closed: boolean
          p_name: string
          p_notes?: string
          p_opens_at?: string
          target_exception_id: string
          target_tenant_id: string
        }
        Returns: boolean
      }
      update_resource_time_off: {
        Args: {
          p_ends_at?: string
          p_is_active?: boolean
          p_is_all_day?: boolean
          p_location_id?: string
          p_notes?: string
          p_starts_at?: string
          p_tenant_id: string
          p_time_off_id: string
          p_title?: string
        }
        Returns: boolean
      }
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
