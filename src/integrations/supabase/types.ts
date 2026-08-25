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
      ae_answer_history: {
        Row: {
          answer_id: string
          changed_at: string
          id: string
          source: string | null
          user_id: string
          value: Json | null
        }
        Insert: {
          answer_id: string
          changed_at?: string
          id?: string
          source?: string | null
          user_id: string
          value?: Json | null
        }
        Update: {
          answer_id?: string
          changed_at?: string
          id?: string
          source?: string | null
          user_id?: string
          value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ae_answer_history_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "ae_answers"
            referencedColumns: ["id"]
          },
        ]
      }
      ae_answers: {
        Row: {
          client_updated_at: string | null
          created_at: string
          id: string
          question_id: string
          server_updated_at: string
          session_id: string
          skipped: boolean
          time_ms: number | null
          user_id: string
          value: Json | null
        }
        Insert: {
          client_updated_at?: string | null
          created_at?: string
          id?: string
          question_id: string
          server_updated_at?: string
          session_id: string
          skipped?: boolean
          time_ms?: number | null
          user_id: string
          value?: Json | null
        }
        Update: {
          client_updated_at?: string | null
          created_at?: string
          id?: string
          question_id?: string
          server_updated_at?: string
          session_id?: string
          skipped?: boolean
          time_ms?: number | null
          user_id?: string
          value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ae_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "ae_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ae_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ae_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ae_audit: {
        Row: {
          at: string
          event: string
          id: string
          payload: Json
          session_id: string | null
          user_id: string
        }
        Insert: {
          at?: string
          event: string
          id?: string
          payload?: Json
          session_id?: string | null
          user_id: string
        }
        Update: {
          at?: string
          event?: string
          id?: string
          payload?: Json
          session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ae_audit_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ae_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ae_autosave_queue: {
        Row: {
          attempts: number
          created_at: string
          id: string
          next_attempt_at: string
          payload: Json
          session_id: string
          user_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          next_attempt_at?: string
          payload: Json
          session_id: string
          user_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          next_attempt_at?: string
          payload?: Json
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ae_autosave_queue_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ae_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ae_branch_rules: {
        Row: {
          created_at: string
          id: string
          order_index: number
          rule: Json
          source_question_id: string
          target: Json
          updated_at: string
          version_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_index?: number
          rule: Json
          source_question_id: string
          target: Json
          updated_at?: string
          version_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_index?: number
          rule?: Json
          source_question_id?: string
          target?: Json
          updated_at?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ae_branch_rules_source_question_id_fkey"
            columns: ["source_question_id"]
            isOneToOne: false
            referencedRelation: "ae_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ae_branch_rules_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "assessment_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      ae_dimensions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          layer_id: string
          order_index: number
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          layer_id: string
          order_index: number
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          layer_id?: string
          order_index?: number
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ae_dimensions_layer_id_fkey"
            columns: ["layer_id"]
            isOneToOne: false
            referencedRelation: "ae_layers"
            referencedColumns: ["id"]
          },
        ]
      }
      ae_evidence: {
        Row: {
          answer_id: string | null
          confidence: number
          construct: string
          created_at: string
          id: string
          kind: string
          layer_slug: string
          question_id: string
          session_id: string
          source: string
          strength: number
          user_id: string
          version_id: string
          weight: number
        }
        Insert: {
          answer_id?: string | null
          confidence?: number
          construct: string
          created_at?: string
          id?: string
          kind?: string
          layer_slug: string
          question_id: string
          session_id: string
          source: string
          strength: number
          user_id: string
          version_id: string
          weight?: number
        }
        Update: {
          answer_id?: string | null
          confidence?: number
          construct?: string
          created_at?: string
          id?: string
          kind?: string
          layer_slug?: string
          question_id?: string
          session_id?: string
          source?: string
          strength?: number
          user_id?: string
          version_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "ae_evidence_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "ae_answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ae_evidence_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "ae_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ae_evidence_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ae_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ae_evidence_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "assessment_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      ae_layers: {
        Row: {
          created_at: string
          est_minutes: number | null
          id: string
          order_index: number
          purpose: string | null
          slug: string
          title: string
          updated_at: string
          version_id: string
        }
        Insert: {
          created_at?: string
          est_minutes?: number | null
          id?: string
          order_index: number
          purpose?: string | null
          slug: string
          title: string
          updated_at?: string
          version_id: string
        }
        Update: {
          created_at?: string
          est_minutes?: number | null
          id?: string
          order_index?: number
          purpose?: string | null
          slug?: string
          title?: string
          updated_at?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ae_layers_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "assessment_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      ae_question_options: {
        Row: {
          created_at: string
          id: string
          label: Json
          meta: Json
          order_index: number
          question_id: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: Json
          meta?: Json
          order_index: number
          question_id: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: Json
          meta?: Json
          order_index?: number
          question_id?: string
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "ae_question_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "ae_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      ae_question_types: {
        Row: {
          config_schema: Json
          created_at: string
          id: string
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          config_schema?: Json
          created_at?: string
          id?: string
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          config_schema?: Json
          created_at?: string
          id?: string
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      ae_questions: {
        Row: {
          a11y: Json
          config: Json
          created_at: string
          description: Json | null
          dimension_id: string | null
          helper: Json | null
          id: string
          layer_id: string
          order_index: number
          prompt: Json
          required: boolean
          slug: string
          type_id: string
          updated_at: string
          version_id: string
        }
        Insert: {
          a11y?: Json
          config?: Json
          created_at?: string
          description?: Json | null
          dimension_id?: string | null
          helper?: Json | null
          id?: string
          layer_id: string
          order_index: number
          prompt: Json
          required?: boolean
          slug: string
          type_id: string
          updated_at?: string
          version_id: string
        }
        Update: {
          a11y?: Json
          config?: Json
          created_at?: string
          description?: Json | null
          dimension_id?: string | null
          helper?: Json | null
          id?: string
          layer_id?: string
          order_index?: number
          prompt?: Json
          required?: boolean
          slug?: string
          type_id?: string
          updated_at?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ae_questions_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "ae_dimensions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ae_questions_layer_id_fkey"
            columns: ["layer_id"]
            isOneToOne: false
            referencedRelation: "ae_layers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ae_questions_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "ae_question_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ae_questions_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "assessment_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      ae_session_progress: {
        Row: {
          answered_count: number
          confidence_score: number | null
          layer_progress: Json
          overall_pct: number
          remaining_count: number
          session_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answered_count?: number
          confidence_score?: number | null
          layer_progress?: Json
          overall_pct?: number
          remaining_count?: number
          session_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answered_count?: number
          confidence_score?: number | null
          layer_progress?: Json
          overall_pct?: number
          remaining_count?: number
          session_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ae_session_progress_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "ae_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ae_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          current_layer_id: string | null
          current_question_id: string | null
          device: Json
          id: string
          last_activity_at: string
          resume_token: string
          started_at: string
          status: string
          updated_at: string
          user_id: string
          version_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_layer_id?: string | null
          current_question_id?: string | null
          device?: Json
          id?: string
          last_activity_at?: string
          resume_token?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
          version_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_layer_id?: string | null
          current_question_id?: string | null
          device?: Json
          id?: string
          last_activity_at?: string
          resume_token?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ae_sessions_current_layer_id_fkey"
            columns: ["current_layer_id"]
            isOneToOne: false
            referencedRelation: "ae_layers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ae_sessions_current_question_id_fkey"
            columns: ["current_question_id"]
            isOneToOne: false
            referencedRelation: "ae_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ae_sessions_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "assessment_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_history: {
        Row: {
          ai_response: string | null
          context_used: Json | null
          created_at: string
          id: string
          message_role: string
          user_id: string
          user_message: string | null
        }
        Insert: {
          ai_response?: string | null
          context_used?: Json | null
          created_at?: string
          id?: string
          message_role: string
          user_id: string
          user_message?: string | null
        }
        Update: {
          ai_response?: string | null
          context_used?: Json | null
          created_at?: string
          id?: string
          message_role?: string
          user_id?: string
          user_message?: string | null
        }
        Relationships: []
      }
      ai_prompts: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          model: string
          name: string
          prompt_template: string
          response_format: string
          temperature: number | null
          updated_at: string
          version: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          model?: string
          name: string
          prompt_template: string
          response_format?: string
          temperature?: number | null
          updated_at?: string
          version?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          model?: string
          name?: string
          prompt_template?: string
          response_format?: string
          temperature?: number | null
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string
          event_name: string
          id: string
          properties: Json
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_name: string
          id?: string
          properties?: Json
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_name?: string
          id?: string
          properties?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      assessment_definitions: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      assessment_questions: {
        Row: {
          active_status: boolean
          career_mapping: Json
          category: string
          created_at: string
          difficulty_level: string | null
          display_order: number
          id: string
          options: Json
          question_text: string
          question_type: string
          weightage: Json
        }
        Insert: {
          active_status?: boolean
          career_mapping?: Json
          category: string
          created_at?: string
          difficulty_level?: string | null
          display_order?: number
          id?: string
          options?: Json
          question_text: string
          question_type?: string
          weightage?: Json
        }
        Update: {
          active_status?: boolean
          career_mapping?: Json
          category?: string
          created_at?: string
          difficulty_level?: string | null
          display_order?: number
          id?: string
          options?: Json
          question_text?: string
          question_type?: string
          weightage?: Json
        }
        Relationships: []
      }
      assessment_responses: {
        Row: {
          created_at: string
          id: string
          question_id: string | null
          response: Json
          score: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          question_id?: string | null
          response: Json
          score?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          question_id?: string | null
          response?: Json
          score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "assessment_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_versions: {
        Row: {
          created_at: string
          definition_id: string
          id: string
          is_published: boolean
          published_at: string | null
          snapshot: Json | null
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          definition_id: string
          id?: string
          is_published?: boolean
          published_at?: string | null
          snapshot?: Json | null
          updated_at?: string
          version: number
        }
        Update: {
          created_at?: string
          definition_id?: string
          id?: string
          is_published?: boolean
          published_at?: string | null
          snapshot?: Json | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessment_versions_definition_id_fkey"
            columns: ["definition_id"]
            isOneToOne: false
            referencedRelation: "assessment_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          created_at: string
          id: string
          responses: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          responses: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          responses?: Json
          user_id?: string
        }
        Relationships: []
      }
      career_matches: {
        Row: {
          career_id: string | null
          career_name: string
          created_at: string
          first_step: string | null
          id: string
          match_percentage: number
          reasoning: string | null
          skill_gap: Json
          strength_alignment: Json | null
          user_id: string
          weakness_alignment: Json | null
          why_it_matches: Json
        }
        Insert: {
          career_id?: string | null
          career_name: string
          created_at?: string
          first_step?: string | null
          id?: string
          match_percentage: number
          reasoning?: string | null
          skill_gap?: Json
          strength_alignment?: Json | null
          user_id: string
          weakness_alignment?: Json | null
          why_it_matches?: Json
        }
        Update: {
          career_id?: string | null
          career_name?: string
          created_at?: string
          first_step?: string | null
          id?: string
          match_percentage?: number
          reasoning?: string | null
          skill_gap?: Json
          strength_alignment?: Json | null
          user_id?: string
          weakness_alignment?: Json | null
          why_it_matches?: Json
        }
        Relationships: [
          {
            foreignKeyName: "career_matches_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "careers"
            referencedColumns: ["id"]
          },
        ]
      }
      career_profiles: {
        Row: {
          advanced_skills: Json
          alternative_careers: Json
          beginner_entry_path: Json
          career_growth_path: Json
          career_identity: string | null
          career_name: string
          category: string | null
          common_misconceptions: Json
          common_traps: Json
          created_at: string
          education_paths: Json
          financial_barriers: string | null
          future_scope: string | null
          global_opportunities: string | null
          id: string
          ideal_personality: Json
          interest_alignment: Json
          one_year_growth_path: Json
          portfolio_projects: Json
          required_skills: Json
          salary_reality_india: Json
          short_description: string | null
          six_month_growth_path: Json
          strength_alignment: Json
          time_commitment: string | null
          tools_and_technologies: Json
          untrap_first_step: string | null
          updated_at: string
          who_should_avoid: string | null
          who_should_consider: string | null
        }
        Insert: {
          advanced_skills?: Json
          alternative_careers?: Json
          beginner_entry_path?: Json
          career_growth_path?: Json
          career_identity?: string | null
          career_name: string
          category?: string | null
          common_misconceptions?: Json
          common_traps?: Json
          created_at?: string
          education_paths?: Json
          financial_barriers?: string | null
          future_scope?: string | null
          global_opportunities?: string | null
          id?: string
          ideal_personality?: Json
          interest_alignment?: Json
          one_year_growth_path?: Json
          portfolio_projects?: Json
          required_skills?: Json
          salary_reality_india?: Json
          short_description?: string | null
          six_month_growth_path?: Json
          strength_alignment?: Json
          time_commitment?: string | null
          tools_and_technologies?: Json
          untrap_first_step?: string | null
          updated_at?: string
          who_should_avoid?: string | null
          who_should_consider?: string | null
        }
        Update: {
          advanced_skills?: Json
          alternative_careers?: Json
          beginner_entry_path?: Json
          career_growth_path?: Json
          career_identity?: string | null
          career_name?: string
          category?: string | null
          common_misconceptions?: Json
          common_traps?: Json
          created_at?: string
          education_paths?: Json
          financial_barriers?: string | null
          future_scope?: string | null
          global_opportunities?: string | null
          id?: string
          ideal_personality?: Json
          interest_alignment?: Json
          one_year_growth_path?: Json
          portfolio_projects?: Json
          required_skills?: Json
          salary_reality_india?: Json
          short_description?: string | null
          six_month_growth_path?: Json
          strength_alignment?: Json
          time_commitment?: string | null
          tools_and_technologies?: Json
          untrap_first_step?: string | null
          updated_at?: string
          who_should_avoid?: string | null
          who_should_consider?: string | null
        }
        Relationships: []
      }
      career_reports: {
        Row: {
          career_paths: Json
          created_at: string
          id: string
          next_steps: Json
          obstacles: Json
          personality: string
          strengths: Json
          user_id: string
        }
        Insert: {
          career_paths: Json
          created_at?: string
          id?: string
          next_steps: Json
          obstacles: Json
          personality: string
          strengths: Json
          user_id: string
        }
        Update: {
          career_paths?: Json
          created_at?: string
          id?: string
          next_steps?: Json
          obstacles?: Json
          personality?: string
          strengths?: Json
          user_id?: string
        }
        Relationships: []
      }
      career_traps: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          recommended_actions: Json
          solutions: Json
          symptoms: Json
          trap_name: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          recommended_actions?: Json
          solutions?: Json
          symptoms?: Json
          trap_name: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          recommended_actions?: Json
          solutions?: Json
          symptoms?: Json
          trap_name?: string
        }
        Relationships: []
      }
      careers: {
        Row: {
          beginner_steps: Json
          career_name: string
          career_summary: string | null
          category: string | null
          common_myths: Json
          created_at: string
          description: string | null
          difficulty_level: string | null
          education_paths: Json
          future_scope: string | null
          id: string
          ideal_personality: Json
          required_interests: Json
          required_skills: Json
          required_strengths: Json
          salary_information: Json
          updated_at: string
        }
        Insert: {
          beginner_steps?: Json
          career_name: string
          career_summary?: string | null
          category?: string | null
          common_myths?: Json
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          education_paths?: Json
          future_scope?: string | null
          id?: string
          ideal_personality?: Json
          required_interests?: Json
          required_skills?: Json
          required_strengths?: Json
          salary_information?: Json
          updated_at?: string
        }
        Update: {
          beginner_steps?: Json
          career_name?: string
          career_summary?: string | null
          category?: string | null
          common_myths?: Json
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          education_paths?: Json
          future_scope?: string | null
          id?: string
          ideal_personality?: Json
          required_interests?: Json
          required_skills?: Json
          required_strengths?: Json
          salary_information?: Json
          updated_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_tasks: {
        Row: {
          completed: boolean
          completion_date: string | null
          created_at: string
          day_number: number | null
          description: string | null
          difficulty: string | null
          estimated_time: string | null
          id: string
          roadmap_id: string
          task_title: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completion_date?: string | null
          created_at?: string
          day_number?: number | null
          description?: string | null
          difficulty?: string | null
          estimated_time?: string | null
          id?: string
          roadmap_id: string
          task_title: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completion_date?: string | null
          created_at?: string
          day_number?: number | null
          description?: string | null
          difficulty?: string | null
          estimated_time?: string | null
          id?: string
          roadmap_id?: string
          task_title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_tasks_roadmap_id_fkey"
            columns: ["roadmap_id"]
            isOneToOne: false
            referencedRelation: "user_roadmaps"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base: {
        Row: {
          category: string | null
          content: string
          created_at: string
          embedding: Json | null
          id: string
          metadata: Json
          title: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          embedding?: Json | null
          id?: string
          metadata?: Json
          title: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          embedding?: Json | null
          id?: string
          metadata?: Json
          title?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          city: string | null
          created_at: string
          education_level: string | null
          id: string
          language: string | null
          name: string | null
          onboarded: boolean
          updated_at: string
        }
        Insert: {
          age?: number | null
          city?: string | null
          created_at?: string
          education_level?: string | null
          id: string
          language?: string | null
          name?: string | null
          onboarded?: boolean
          updated_at?: string
        }
        Update: {
          age?: number | null
          city?: string | null
          created_at?: string
          education_level?: string | null
          id?: string
          language?: string | null
          name?: string | null
          onboarded?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      roadmap_tasks: {
        Row: {
          completed: boolean
          created_at: string
          description: string
          id: string
          task_order: number
          title: string
          user_id: string
          week: number
        }
        Insert: {
          completed?: boolean
          created_at?: string
          description: string
          id?: string
          task_order: number
          title: string
          user_id: string
          week: number
        }
        Update: {
          completed?: boolean
          created_at?: string
          description?: string
          id?: string
          task_order?: number
          title?: string
          user_id?: string
          week?: number
        }
        Relationships: []
      }
      roadmap_templates: {
        Row: {
          career_id: string | null
          created_at: string
          duration: string
          id: string
          milestones: Json
          skills: Json
          weeks: Json
        }
        Insert: {
          career_id?: string | null
          created_at?: string
          duration?: string
          id?: string
          milestones?: Json
          skills?: Json
          weeks?: Json
        }
        Update: {
          career_id?: string | null
          created_at?: string
          duration?: string
          id?: string
          milestones?: Json
          skills?: Json
          weeks?: Json
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_templates_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "careers"
            referencedColumns: ["id"]
          },
        ]
      }
      student_intelligence_profile: {
        Row: {
          completed_at: string | null
          constructs: Json
          created_at: string
          dimensions_measured: number
          evidence_count: number
          id: string
          insights: Json
          layer_slug: string
          layer_version: string
          overall_confidence: number | null
          session_id: string | null
          updated_at: string
          user_id: string
          version_id: string
        }
        Insert: {
          completed_at?: string | null
          constructs?: Json
          created_at?: string
          dimensions_measured?: number
          evidence_count?: number
          id?: string
          insights?: Json
          layer_slug: string
          layer_version?: string
          overall_confidence?: number | null
          session_id?: string | null
          updated_at?: string
          user_id: string
          version_id: string
        }
        Update: {
          completed_at?: string | null
          constructs?: Json
          created_at?: string
          dimensions_measured?: number
          evidence_count?: number
          id?: string
          insights?: Json
          layer_slug?: string
          layer_version?: string
          overall_confidence?: number | null
          session_id?: string | null
          updated_at?: string
          user_id?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_intelligence_profile_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ae_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_intelligence_profile_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "assessment_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      student_memories: {
        Row: {
          content: string
          created_at: string
          id: string
          importance: number
          memory_type: string
          source: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          importance?: number
          memory_type: string
          source?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          importance?: number
          memory_type?: string
          source?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      student_moat_profile: {
        Row: {
          ambition_density: string | null
          career_experiment_status: Json
          childhood_pattern_tags: Json
          confidence_score: number | null
          created_at: string
          current_identity: string | null
          decision_style: Database["public"]["Enums"]["decision_style"] | null
          desired_identity: string | null
          digital_twin_state: Json
          energy_profile: Json
          environment_upgrade_actions: Json
          exposure_insight: string | null
          exposure_score: number | null
          family_dynamics_score: number | null
          family_insight: string | null
          family_value_orientation: string | null
          fear_profile: Json
          friend_circle_insight: string | null
          friend_circle_score: number | null
          id: string
          identity_bridge: string | null
          identity_gap_score: number | null
          last_inferred_at: string | null
          life_story_summary: string | null
          mentor_memory_graph: Json
          parent_bridge_status: Json
          primary_fear: string | null
          reality_constraints: Json
          signal_gaps: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          ambition_density?: string | null
          career_experiment_status?: Json
          childhood_pattern_tags?: Json
          confidence_score?: number | null
          created_at?: string
          current_identity?: string | null
          decision_style?: Database["public"]["Enums"]["decision_style"] | null
          desired_identity?: string | null
          digital_twin_state?: Json
          energy_profile?: Json
          environment_upgrade_actions?: Json
          exposure_insight?: string | null
          exposure_score?: number | null
          family_dynamics_score?: number | null
          family_insight?: string | null
          family_value_orientation?: string | null
          fear_profile?: Json
          friend_circle_insight?: string | null
          friend_circle_score?: number | null
          id?: string
          identity_bridge?: string | null
          identity_gap_score?: number | null
          last_inferred_at?: string | null
          life_story_summary?: string | null
          mentor_memory_graph?: Json
          parent_bridge_status?: Json
          primary_fear?: string | null
          reality_constraints?: Json
          signal_gaps?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          ambition_density?: string | null
          career_experiment_status?: Json
          childhood_pattern_tags?: Json
          confidence_score?: number | null
          created_at?: string
          current_identity?: string | null
          decision_style?: Database["public"]["Enums"]["decision_style"] | null
          desired_identity?: string | null
          digital_twin_state?: Json
          energy_profile?: Json
          environment_upgrade_actions?: Json
          exposure_insight?: string | null
          exposure_score?: number | null
          family_dynamics_score?: number | null
          family_insight?: string | null
          family_value_orientation?: string | null
          fear_profile?: Json
          friend_circle_insight?: string | null
          friend_circle_score?: number | null
          id?: string
          identity_bridge?: string | null
          identity_gap_score?: number | null
          last_inferred_at?: string | null
          life_story_summary?: string | null
          mentor_memory_graph?: Json
          parent_bridge_status?: Json
          primary_fear?: string | null
          reality_constraints?: Json
          signal_gaps?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      student_profiles: {
        Row: {
          age: number | null
          city: string | null
          created_at: string
          current_stage: string | null
          education_level: string | null
          family_background: string | null
          financial_condition: string | null
          full_name: string | null
          id: string
          language_preference: string | null
          learning_preference: string | null
          state: string | null
          time_available_daily: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          age?: number | null
          city?: string | null
          created_at?: string
          current_stage?: string | null
          education_level?: string | null
          family_background?: string | null
          financial_condition?: string | null
          full_name?: string | null
          id?: string
          language_preference?: string | null
          learning_preference?: string | null
          state?: string | null
          time_available_daily?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          age?: number | null
          city?: string | null
          created_at?: string
          current_stage?: string | null
          education_level?: string | null
          family_background?: string | null
          financial_condition?: string | null
          full_name?: string | null
          id?: string
          language_preference?: string | null
          learning_preference?: string | null
          state?: string | null
          time_available_daily?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_progress: {
        Row: {
          career_clarity_score: number
          confidence_score: number
          current_streak: number
          id: string
          skill_progress: Json
          tasks_completed: number
          updated_at: string
          user_id: string
        }
        Insert: {
          career_clarity_score?: number
          confidence_score?: number
          current_streak?: number
          id?: string
          skill_progress?: Json
          tasks_completed?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          career_clarity_score?: number
          confidence_score?: number
          current_streak?: number
          id?: string
          skill_progress?: Json
          tasks_completed?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roadmaps: {
        Row: {
          career_id: string | null
          created_at: string
          duration: string
          generated_plan: Json
          goal: string | null
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          career_id?: string | null
          created_at?: string
          duration?: string
          generated_plan?: Json
          goal?: string | null
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          career_id?: string | null
          created_at?: string
          duration?: string
          generated_plan?: Json
          goal?: string | null
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roadmaps_career_id_fkey"
            columns: ["career_id"]
            isOneToOne: false
            referencedRelation: "careers"
            referencedColumns: ["id"]
          },
        ]
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
      user_traps: {
        Row: {
          created_at: string
          explanation: string | null
          id: string
          recommended_solution: string | null
          severity: string
          status: string
          trap_id: string | null
          trap_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          explanation?: string | null
          id?: string
          recommended_solution?: string | null
          severity?: string
          status?: string
          trap_id?: string | null
          trap_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          explanation?: string | null
          id?: string
          recommended_solution?: string | null
          severity?: string
          status?: string
          trap_id?: string | null
          trap_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_traps_trap_id_fkey"
            columns: ["trap_id"]
            isOneToOne: false
            referencedRelation: "career_traps"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_reflections: {
        Row: {
          confidence_rating: number | null
          created_at: string
          feedback: string | null
          id: string
          user_id: string
          week_number: number
          what_learned: string | null
          what_was_difficult: string | null
        }
        Insert: {
          confidence_rating?: number | null
          created_at?: string
          feedback?: string | null
          id?: string
          user_id: string
          week_number: number
          what_learned?: string | null
          what_was_difficult?: string | null
        }
        Update: {
          confidence_rating?: number | null
          created_at?: string
          feedback?: string | null
          id?: string
          user_id?: string
          week_number?: number
          what_learned?: string | null
          what_was_difficult?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      import_career_profiles: { Args: { _payload: Json }; Returns: number }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      decision_style: "explorer" | "analyzer" | "executor" | "avoider"
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
      decision_style: ["explorer", "analyzer", "executor", "avoider"],
    },
  },
} as const
