import { Ticket } from '../models/Ticket.js';
import { Message } from '../models/Message.js';
import { AIAnalysis } from '../models/AIAnalysis.js';
import { Conversation } from '../models/Conversation.js';
import { GeneratedResponse } from '../models/GeneratedResponse.js';
import { Escalation } from '../models/Escalation.js';
import { AuditLog } from '../models/AuditLog.js';
import { aiServiceClient } from '../services/aiServiceClient.js';

export const createTicket = async (req, res, next) => {
  try {
    const { subject, description, category } = req.body;

    if (!subject || !description) {
      return res.status(400).json({ success: false, error: 'Subject and description are required.' });
    }

    // Generate unique Ticket ID
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const ticketNumber = `TIC-${randomSuffix}`;

    // 1. Create Ticket
    const ticket = await Ticket.create({
      ticketNumber,
      organization: req.orgId,
      customer: req.user._id,
      subject,
      description,
      category: category || 'General Inquiry',
      priority: 'Medium',
      status: 'New',
      source: 'portal'
    });

    // 2. Create Initial Message
    await Message.create({
      ticket: ticket._id,
      organization: req.orgId,
      sender: req.user._id,
      senderRole: req.user.role,
      content: description
    });

    // 3. Trigger AI Classification
    const previousTicketsCount = await Ticket.countDocuments({
      organization: req.orgId,
      customer: req.user._id
    });

    const aiResult = await aiServiceClient.classifyTicket(subject, description, previousTicketsCount - 1);

    // Save AI Analysis
    const analysis = await AIAnalysis.create({
      ticket: ticket._id,
      organization: req.orgId,
      intent: aiResult.intent,
      category: aiResult.category,
      priority: aiResult.priority,
      sentiment: aiResult.sentiment,
      mainIssue: aiResult.main_issue,
      keywords: aiResult.keywords,
      urgencyScore: aiResult.urgency_score,
      confidence: aiResult.confidence
    });

    // Update ticket with AI predicted attributes
    ticket.category = aiResult.category || ticket.category;
    ticket.priority = aiResult.priority || ticket.priority;
    ticket.sentiment = aiResult.sentiment || ticket.sentiment;
    ticket.status = 'Open';

    // 4. Escalation Rule Check: If Critical Priority or Frustrated + High
    if (aiResult.priority === 'Critical') {
      ticket.isEscalated = true;
      ticket.escalatedReason = `AI Priority Engine detected critical urgency: ${aiResult.main_issue}`;
      ticket.escalatedAt = new Date();
      ticket.status = 'Escalated';

      await Escalation.create({
        ticket: ticket._id,
        organization: req.orgId,
        ruleTriggered: 'CRITICAL_URGENCY_AUTO_ESCALATION',
        reason: ticket.escalatedReason,
        previousPriority: 'Medium',
        newPriority: 'Critical',
        triggeredBy: 'ai_engine'
      });
    }

    await ticket.save();

    // 5. Pre-generate RAG Draft Response
    const draftGen = await aiServiceClient.generateResponse({
      org_id: req.orgId,
      ticket_id: ticket._id.toString(),
      customer_name: req.user.name,
      subject: ticket.subject,
      latest_message: description,
      tone: 'Professional'
    });

    if (draftGen) {
      await GeneratedResponse.create({
        ticket: ticket._id,
        organization: req.orgId,
        suggestedText: draftGen.suggested_response,
        tone: draftGen.tone || 'Professional',
        retrievedSources: (draftGen.sources_used || []).map(s => ({
          docId: s.doc_id,
          docTitle: s.doc_title,
          chunkIndex: s.chunk_index,
          snippet: s.snippet,
          score: s.score
        })),
        confidenceScore: draftGen.confidence_score,
        sufficientContext: draftGen.sufficient_context,
        modelProvider: draftGen.model_provider,
        status: 'draft'
      });
    }

    // 6. Initialize Conversation Summary
    await Conversation.create({
      ticket: ticket._id,
      organization: req.orgId,
      summary: `Ticket created. Customer reported: "${subject}".`,
      originalProblem: subject,
      suggestedNextAction: 'Support agent review classification and draft response.'
    });

    // 7. Audit Log
    await AuditLog.create({
      organization: req.orgId,
      user: req.user._id,
      action: 'TICKET_CREATE',
      entityType: 'Ticket',
      entityId: ticket._id.toString(),
      details: { ticketNumber: ticket.ticketNumber, priority: ticket.priority, category: ticket.category }
    });

    // Broadcast Real-time Event via Socket.IO
    if (req.app.get('io')) {
      req.app.get('io').to(req.orgId).emit('ticket:new', {
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        priority: ticket.priority,
        category: ticket.category,
        sentiment: ticket.sentiment,
        id: ticket._id
      });
    }

    res.status(201).json({
      success: true,
      ticket,
      analysis
    });
  } catch (error) {
    next(error);
  }
};

export const getTickets = async (req, res, next) => {
  try {
    const {
      status,
      priority,
      category,
      sentiment,
      search,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = { organization: req.orgId };

    // Customers only see their own tickets
    if (req.user.role === 'customer') {
      query.customer = req.user._id;
    }

    if (status && status !== 'all') query.status = status;
    if (priority && priority !== 'all') query.priority = priority;
    if (category && category !== 'all') query.category = category;
    if (sentiment && sentiment !== 'all') query.sentiment = sentiment;

    if (search) {
      query.$or = [
        { ticketNumber: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [tickets, total] = await Promise.all([
      Ticket.find(query)
        .populate('customer', 'name email avatar')
        .populate('assignedAgent', 'name email avatar')
        .sort(sort)
        .skip(skip)
        .limit(limitNum),
      Ticket.countDocuments(query)
    ]);

    res.json({
      success: true,
      tickets,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1
    });
  } catch (error) {
    next(error);
  }
};

export const getTicketById = async (req, res, next) => {
  try {
    const ticket = await Ticket.findOne({
      _id: req.params.id,
      organization: req.orgId
    })
      .populate('customer', 'name email role avatar')
      .populate('assignedAgent', 'name email role avatar');

    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    // Role check for customer
    if (req.user.role === 'customer' && ticket.customer._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized to view this ticket' });
    }

    const [messages, analysis, conversation, latestDraft, escalations] = await Promise.all([
      Message.find({ ticket: ticket._id })
        .populate('sender', 'name email role avatar')
        .sort({ createdAt: 1 }),
      AIAnalysis.findOne({ ticket: ticket._id }),
      Conversation.findOne({ ticket: ticket._id }),
      GeneratedResponse.findOne({ ticket: ticket._id, status: 'draft' }).sort({ createdAt: -1 }),
      Escalation.find({ ticket: ticket._id }).sort({ createdAt: -1 })
    ]);

    res.json({
      success: true,
      ticket,
      messages,
      analysis,
      conversation,
      latestDraft,
      escalations
    });
  } catch (error) {
    next(error);
  }
};

export const updateTicket = async (req, res, next) => {
  try {
    const { status, priority, category, assignedAgent } = req.body;

    const ticket = await Ticket.findOne({
      _id: req.params.id,
      organization: req.orgId
    });

    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    if (status && status !== ticket.status) {
      ticket.status = status;
      if (status === 'Resolved') ticket.resolvedAt = new Date();
      if (status === 'Closed') ticket.closedAt = new Date();
    }

    if (priority) ticket.priority = priority;
    if (category) ticket.category = category;
    if (assignedAgent !== undefined) ticket.assignedAgent = assignedAgent || null;

    await ticket.save();

    await AuditLog.create({
      organization: req.orgId,
      user: req.user._id,
      action: 'TICKET_UPDATE',
      entityType: 'Ticket',
      entityId: ticket._id.toString(),
      details: { status: ticket.status, priority: ticket.priority, assignedAgent: ticket.assignedAgent }
    });

    if (req.app.get('io')) {
      req.app.get('io').to(req.orgId).emit('ticket:updated', {
        id: ticket._id,
        ticketNumber: ticket.ticketNumber,
        status: ticket.status,
        priority: ticket.priority,
        category: ticket.category,
        assignedAgent: ticket.assignedAgent
      });
    }

    res.json({
      success: true,
      ticket
    });
  } catch (error) {
    next(error);
  }
};

export const escalateTicket = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const ticket = await Ticket.findOne({
      _id: req.params.id,
      organization: req.orgId
    });

    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    const previousPriority = ticket.priority;
    ticket.isEscalated = true;
    ticket.priority = 'Critical';
    ticket.status = 'Escalated';
    ticket.escalatedReason = reason || 'Manual escalation requested by support agent.';
    ticket.escalatedAt = new Date();

    await ticket.save();

    const escalation = await Escalation.create({
      ticket: ticket._id,
      organization: req.orgId,
      ruleTriggered: 'MANUAL_AGENT_ESCALATION',
      reason: ticket.escalatedReason,
      previousPriority,
      newPriority: 'Critical',
      triggeredBy: req.user.role === 'supervisor' ? 'supervisor' : 'agent'
    });

    await AuditLog.create({
      organization: req.orgId,
      user: req.user._id,
      action: 'TICKET_ESCALATE',
      entityType: 'Ticket',
      entityId: ticket._id.toString(),
      details: { reason: ticket.escalatedReason }
    });

    if (req.app.get('io')) {
      req.app.get('io').to(req.orgId).emit('ticket:escalated', {
        id: ticket._id,
        ticketNumber: ticket.ticketNumber,
        reason: ticket.escalatedReason
      });
    }

    res.json({
      success: true,
      ticket,
      escalation
    });
  } catch (error) {
    next(error);
  }
};

export const overrideAIAnalysis = async (req, res, next) => {
  try {
    const { category, priority, sentiment } = req.body;
    const analysis = await AIAnalysis.findOne({
      ticket: req.params.id,
      organization: req.orgId
    });

    if (!analysis) {
      return res.status(404).json({ success: false, error: 'AI Analysis record not found' });
    }

    if (category) analysis.category = category;
    if (priority) analysis.priority = priority;
    if (sentiment) analysis.sentiment = sentiment;

    analysis.isAgentOverridden = true;
    analysis.overriddenBy = req.user._id;

    await analysis.save();

    // Also update ticket
    const ticket = await Ticket.findById(req.params.id);
    if (ticket) {
      if (category) ticket.category = category;
      if (priority) ticket.priority = priority;
      if (sentiment) ticket.sentiment = sentiment;
      await ticket.save();
    }

    res.json({
      success: true,
      analysis,
      ticket
    });
  } catch (error) {
    next(error);
  }
};
