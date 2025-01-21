import { supabase } from '@/lib/supabase';
import {
  CustomerProfile,
  PortalPreferences,
  ArticleInteraction,
  ArticleRating,
  PortalActivity,
  CustomerSupportHistory,
  PortalAnalytics
} from '@/types/portal';
import { Ticket, TicketStatus } from '@/types/ticket';

export class PortalService {
  // Customer Profile Management
  async getProfile(userId: string): Promise<CustomerProfile> {
    const { data: profile, error } = await supabase
      .from('customer_profiles')
      .select('*, user:users(*)')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return profile;
  }

  async updateProfile(userId: string, updates: Partial<CustomerProfile>): Promise<CustomerProfile> {
    const { data: profile, error } = await supabase
      .from('customer_profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return profile;
  }

  async getPreferences(userId: string): Promise<PortalPreferences> {
    const { data: preferences, error } = await supabase
      .from('portal_preferences')
      .select('*')
      .eq('userId', userId)
      .single();

    if (error) throw error;
    return preferences;
  }

  async updatePreferences(userId: string, updates: Partial<PortalPreferences>): Promise<PortalPreferences> {
    const { data: preferences, error } = await supabase
      .from('portal_preferences')
      .update(updates)
      .eq('userId', userId)
      .select()
      .single();

    if (error) throw error;
    return preferences;
  }

  // Ticket Interactions
  async getCustomerTickets(userId: string, page = 1, pageSize = 10): Promise<{ tickets: Ticket[], total: number }> {
    const { data: tickets, error, count } = await supabase
      .from('tickets')
      .select('*, assignee:users(*), customer:users(*)', { count: 'exact' })
      .eq('customerId', userId)
      .order('createdAt', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) throw error;
    return { tickets, total: count || 0 };
  }

  async addTicketComment(ticketId: string, userId: string, content: string): Promise<void> {
    const { error } = await supabase
      .from('ticket_comments')
      .insert([{
        ticketId,
        userId,
        content,
        isInternal: false
      }]);

    if (error) throw error;
  }

  async updateTicketStatus(ticketId: string, status: TicketStatus): Promise<void> {
    const { error } = await supabase
      .from('tickets')
      .update({ status })
      .eq('id', ticketId);

    if (error) throw error;
  }

  // Article Interactions
  async trackArticleInteraction(interaction: Omit<ArticleInteraction, 'id' | 'createdAt'>): Promise<void> {
    const { error } = await supabase
      .from('article_interactions')
      .insert([interaction]);

    if (error) throw error;
  }

  async rateArticle(rating: Omit<ArticleRating, 'id' | 'createdAt' | 'updatedAt'>): Promise<ArticleRating> {
    const { data, error } = await supabase
      .from('article_ratings')
      .upsert([rating], {
        onConflict: 'userId,articleId'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getCustomerHistory(userId: string): Promise<CustomerSupportHistory> {
    const [
      ticketsResponse,
      interactionsResponse,
      mostViewedResponse
    ] = await Promise.all([
      supabase
        .from('tickets')
        .select('*')
        .eq('customerId', userId),
      supabase
        .from('article_interactions')
        .select('*')
        .eq('userId', userId),
      supabase
        .rpc('get_most_viewed_articles', { user_id: userId })
    ]);

    if (ticketsResponse.error) throw ticketsResponse.error;
    if (interactionsResponse.error) throw interactionsResponse.error;
    if (mostViewedResponse.error) throw mostViewedResponse.error;

    const tickets = ticketsResponse.data;
    const resolvedTickets = tickets.filter(t => t.status === 'resolved');
    const totalResolutionTime = resolvedTickets.reduce((acc, t) => {
      return acc + (new Date(t.resolvedAt!).getTime() - new Date(t.createdAt).getTime());
    }, 0);

    return {
      userId,
      tickets: tickets,
      articleInteractions: interactionsResponse.data,
      totalTickets: tickets.length,
      resolvedTickets: resolvedTickets.length,
      averageResolutionTime: resolvedTickets.length ? totalResolutionTime / resolvedTickets.length : 0,
      lastTicketCreated: tickets[0]?.createdAt,
      mostViewedArticles: mostViewedResponse.data
    };
  }

  // Activity Tracking
  async trackActivity(activity: Omit<PortalActivity, 'id' | 'createdAt'>): Promise<void> {
    const { error } = await supabase
      .from('portal_activities')
      .insert([activity]);

    if (error) throw error;
  }

  async getPortalAnalytics(startDate: Date, endDate: Date): Promise<PortalAnalytics> {
    const { data: analytics, error } = await supabase
      .rpc('get_portal_analytics', {
        start_date: startDate,
        end_date: endDate
      });

    if (error) throw error;
    return analytics;
  }

  // Session Management
  async startSession(userId: string, deviceInfo: { type: string; browser: string; os: string }): Promise<string> {
    const { data, error } = await supabase
      .from('portal_sessions')
      .insert([{
        userId,
        device: deviceInfo,
        startedAt: new Date()
      }])
      .select()
      .single();

    if (error) throw error;
    return data.id;
  }

  async endSession(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from('portal_sessions')
      .update({ endedAt: new Date() })
      .eq('id', sessionId);

    if (error) throw error;
  }
} 