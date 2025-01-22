export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      messages: {
        Row: {
          id: string
          ticket_id: string
          content: string
          author_type: 'customer' | 'agent'
          author_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          ticket_id: string
          content: string
          author_type: 'customer' | 'agent'
          author_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          ticket_id?: string
          content?: string
          author_type?: 'customer' | 'agent'
          author_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_author_customer"
            columns: ["author_id", "author_type"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
            condition: "author_type = 'customer'"
          },
          {
            foreignKeyName: "messages_author_agent"
            columns: ["author_id", "author_type"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
            condition: "author_type = 'agent'"
          }
        ]
      }
      customers: {
        Row: {
          id: string
          name: string
          email: string
          avatar: string | null
          company: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          avatar?: string | null
          company?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          avatar?: string | null
          company?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      agents: {
        Row: {
          id: string
          name: string
          email: string
          avatar: string | null
          role: 'agent' | 'admin'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          avatar?: string | null
          role: 'agent' | 'admin'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          avatar?: string | null
          role?: 'agent' | 'admin'
          created_at?: string
          updated_at?: string
        }
      }
      tickets: {
        Row: {
          id: string
          title: string
          description: string
          status: 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed'
          priority: 'low' | 'medium' | 'high' | 'urgent'
          type: 'question' | 'problem' | 'incident' | 'task'
          customer_id: string
          assignee_id: string | null
          source: 'email' | 'web' | 'phone' | 'chat'
          due_date: string | null
          category: string | null
          is_archived: boolean
          metadata: Json
          created_at: string
          updated_at: string
          resolved_at: string | null
        }
        Insert: {
          id?: string
          title: string
          description: string
          status: 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed'
          priority: 'low' | 'medium' | 'high' | 'urgent'
          type: 'question' | 'problem' | 'incident' | 'task'
          customer_id: string
          assignee_id?: string | null
          source: 'email' | 'web' | 'phone' | 'chat'
          due_date?: string | null
          category?: string | null
          is_archived?: boolean
          metadata?: Json
          created_at?: string
          updated_at?: string
          resolved_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          description?: string
          status?: 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed'
          priority?: 'low' | 'medium' | 'high' | 'urgent'
          type?: 'question' | 'problem' | 'incident' | 'task'
          customer_id?: string
          assignee_id?: string | null
          source?: 'email' | 'web' | 'phone' | 'chat'
          due_date?: string | null
          category?: string | null
          is_archived?: boolean
          metadata?: Json
          created_at?: string
          updated_at?: string
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      message_authors: {
        Row: {
          author_id: string
          author_type: 'customer' | 'agent'
          email: string
          name: string
        }
      }
    }
    Functions: {
      [key: string]: {
        Args: Record<string, unknown>
        Returns: unknown
      }
    }
    Enums: {
      [key: string]: string[]
    }
  }
} 