import { prisma } from './db';
import { ChatMessage, ChatSession } from '../src/types';

export class ChatStore {
  public async getUserSessions(userId: string, ramaId?: string): Promise<ChatSession[]> {
    try {
      const whereClause: any = { userId };
      if (ramaId) {
        whereClause.ramaId = ramaId;
      }

      const sessions = await prisma.chatSession.findMany({
        where: whereClause,
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

      return sessions.map(s => ({
        id: s.id,
        userId: s.userId,
        title: s.title,
        ramaId: s.ramaId || undefined,
        categoryFilter: s.categoryFilter || undefined,
        docFilter: (s.docFilter as any) || undefined,
        tags: (s.tags as any) || undefined,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
        messages: s.messages.map(m => ({
          id: m.id,
          role: m.role as any,
          content: m.content,
          timestamp: m.timestamp || m.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          executiveSummary: m.executiveSummary || undefined,
          citations: (m.citations as any) || [],
          graphNodes: (m.graphNodes as any) || [],
          graphLinks: (m.graphLinks as any) || [],
          searchGroundingSources: (m.searchGroundingSources as any) || [],
          isWebGrounded: m.isWebGrounded,
          ragTypeUsed: (m.ragTypeUsed as any) || undefined,
          confidenceScore: m.confidenceScore || undefined,
        })),
      }));
    } catch (err) {
      console.error(`[ChatStore] Error fetching sessions for user ${userId}:`, err);
      return [];
    }
  }

  public async getSessionById(sessionId: string): Promise<ChatSession | null> {
    try {
      const s = await prisma.chatSession.findUnique({
        where: { id: sessionId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!s) return null;

      return {
        id: s.id,
        userId: s.userId,
        title: s.title,
        ramaId: s.ramaId || undefined,
        categoryFilter: s.categoryFilter || undefined,
        docFilter: (s.docFilter as any) || undefined,
        tags: (s.tags as any) || undefined,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
        messages: s.messages.map(m => ({
          id: m.id,
          role: m.role as any,
          content: m.content,
          timestamp: m.timestamp || m.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          executiveSummary: m.executiveSummary || undefined,
          citations: (m.citations as any) || [],
          graphNodes: (m.graphNodes as any) || [],
          graphLinks: (m.graphLinks as any) || [],
          searchGroundingSources: (m.searchGroundingSources as any) || [],
          isWebGrounded: m.isWebGrounded,
          ragTypeUsed: (m.ragTypeUsed as any) || undefined,
          confidenceScore: m.confidenceScore || undefined,
        })),
      };
    } catch (err) {
      console.error(`[ChatStore] Error getting session ${sessionId}:`, err);
      return null;
    }
  }

  public async createSession(
    userId: string,
    title = 'Nueva Consulta Jurídica',
    ramaId?: string,
    categoryFilter?: string,
    docFilter?: string[],
    tags?: string[]
  ): Promise<ChatSession> {
    const s = await prisma.chatSession.create({
      data: {
        userId,
        title,
        ramaId: ramaId || null,
        categoryFilter: categoryFilter || null,
        docFilter: docFilter || [],
        tags: tags || [],
      },
    });

    return {
      id: s.id,
      userId: s.userId,
      title: s.title,
      ramaId: s.ramaId || undefined,
      categoryFilter: s.categoryFilter || undefined,
      docFilter: (s.docFilter as any) || undefined,
      tags: (s.tags as any) || undefined,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      messages: [],
    };
  }

  public async updateSession(
    sessionId: string,
    data: { title?: string; ramaId?: string; categoryFilter?: string; docFilter?: string[]; tags?: string[] }
  ): Promise<boolean> {
    try {
      await prisma.chatSession.update({
        where: { id: sessionId },
        data: {
          title: data.title,
          ramaId: data.ramaId,
          categoryFilter: data.categoryFilter,
          docFilter: data.docFilter,
          tags: data.tags,
        },
      });
      return true;
    } catch (err) {
      console.error(`[ChatStore] Error updating session ${sessionId}:`, err);
      return false;
    }
  }

  public async deleteSession(sessionId: string): Promise<boolean> {
    try {
      await prisma.chatSession.delete({
        where: { id: sessionId },
      });
      return true;
    } catch (err) {
      console.error(`[ChatStore] Error deleting session ${sessionId}:`, err);
      return false;
    }
  }

  public async saveMessage(
    sessionId: string,
    msg: Partial<ChatMessage> & { role: 'user' | 'assistant' | 'system'; content: string }
  ): Promise<ChatMessage> {
    const created = await prisma.chatMessage.create({
      data: {
        id: msg.id && !msg.id.startsWith('msg-') ? msg.id : undefined,
        sessionId,
        role: msg.role,
        content: msg.content,
        executiveSummary: msg.executiveSummary || null,
        citations: (msg.citations as any) || [],
        graphNodes: (msg.graphNodes as any) || [],
        graphLinks: (msg.graphLinks as any) || [],
        searchGroundingSources: (msg.searchGroundingSources as any) || [],
        isWebGrounded: msg.isWebGrounded ?? false,
        ragTypeUsed: msg.ragTypeUsed || null,
        confidenceScore: msg.confidenceScore || null,
        timestamp: msg.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    });

    // Touch session updatedAt
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });

    return {
      id: created.id,
      role: created.role as any,
      content: created.content,
      timestamp: created.timestamp || created.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      executiveSummary: created.executiveSummary || undefined,
      citations: (created.citations as any) || [],
      graphNodes: (created.graphNodes as any) || [],
      graphLinks: (created.graphLinks as any) || [],
      searchGroundingSources: (created.searchGroundingSources as any) || [],
      isWebGrounded: created.isWebGrounded,
      ragTypeUsed: (created.ragTypeUsed as any) || undefined,
      confidenceScore: created.confidenceScore || undefined,
    };
  }
}

export const chatStore = new ChatStore();
