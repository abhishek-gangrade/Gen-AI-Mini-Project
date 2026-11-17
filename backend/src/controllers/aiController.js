import { Ticket } from '../models/Ticket.js';
import { Message } from '../models/Message.js';
import { GeneratedResponse } from '../models/GeneratedResponse.js';
import { AuditLog } from '../models/AuditLog.js';
import { aiServiceClient } from '../services/aiServiceClient.js';

export const generateDraftResponse = async (req, res, next) => {
  try {
    const { ticketId, tone = 'Professional' } = req.body;

    const ticket = await Ticket.findOne({ _id: ticketId, organization: req.orgId }).populate('customer', 'name');
    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    const latestCustomerMsg = await Message.findOne({
      ticket: ticket._id,
      senderRole: 'customer'
    }).sort({ createdAt: -1 });

    const messageText = latestCustomerMsg ? latestCustomerMsg.content : ticket.description;

    const aiRes = await aiServiceClient.generateResponse({
      org_id: req.orgId,
      ticket_id: ticket._id.toString(),
      customer_name: ticket.customer?.name || 'Customer',
      subject: ticket.subject,
      latest_message: messageText,
      tone
    });

    const draft = await GeneratedResponse.create({
      ticket: ticket._id,
      organization: req.orgId,
      suggestedText: aiRes.suggested_response,
      tone: aiRes.tone,
      retrievedSources: (aiRes.sources_used || []).map(s => ({
        docId: s.doc_id,
        docTitle: s.doc_title,
        chunkIndex: s.chunk_index,
        snippet: s.snippet,
        score: s.score
      })),
      confidenceScore: aiRes.confidence_score,
      sufficientContext: aiRes.sufficient_context,
      modelProvider: aiRes.model_provider,
      status: 'draft'
    });

    res.json({
      success: true,
      draft
    });
  } catch (error) {
    next(error);
  }
};

export const approveResponse = async (req, res, next) => {
  try {
    const { draftId, responseText } = req.body;

    const draft = await GeneratedResponse.findOne({
      _id: draftId,
      organization: req.orgId
    });

    if (!draft) {
      return res.status(404).json({ success: false, error: 'Draft response not found' });
    }

    const finalContent = responseText || draft.suggestedText;

    draft.status = 'approved';
    draft.approvedText = finalContent;
    draft.approvedBy = req.user._id;
    draft.sentAt = new Date();
    await draft.save();

    // Create Message from Agent
    const message = await Message.create({
      ticket: draft.ticket,
      organization: req.orgId,
      sender: req.user._id,
      senderRole: req.user.role,
      content: finalContent
    });

    const populatedMessage = await Message.findById(message._id).populate('sender', 'name email role avatar');

    // Update Ticket
    const ticket = await Ticket.findById(draft.ticket);
    if (ticket) {
      if (ticket.status === 'New' || ticket.status === 'Open') {
        ticket.status = 'Waiting for Customer';
      }
      if (!ticket.assignedAgent) {
        ticket.assignedAgent = req.user._id;
      }
      await ticket.save();
    }

    await AuditLog.create({
      organization: req.orgId,
      user: req.user._id,
      action: 'AI_RESPONSE_APPROVE_SEND',
      entityType: 'GeneratedResponse',
      entityId: draft._id.toString(),
      details: { ticketNumber: ticket?.ticketNumber, tone: draft.tone }
    });

    if (req.app.get('io')) {
      req.app.get('io').to(req.orgId).emit('message:new', {
        ticketId: draft.ticket,
        message: populatedMessage
      });
      req.app.get('io').to(req.orgId).emit('ticket:updated', {
        id: ticket._id,
        ticketNumber: ticket.ticketNumber,
        status: ticket.status
      });
    }

    res.json({
      success: true,
      message: populatedMessage,
      draft
    });
  } catch (error) {
    next(error);
  }
};

export const getKnowledgeGaps = async (req, res, next) => {
  try {
    // Find tickets where draft was generated with low context or tickets marked with low confidence
    const responses = await GeneratedResponse.find({
      organization: req.orgId,
      sufficientContext: false
    }).populate('ticket', 'ticketNumber subject description').limit(30);

    const queryPayload = responses.map(r => ({
      query: r.ticket?.subject || 'Undocumented inquiry',
      ticket_id: r.ticket?.ticketNumber || 'TIC-N/A',
      similarity_score: r.confidenceScore || 0.15
    }));

    // If few stored responses, also check recent tickets
    if (queryPayload.length < 3) {
      const tickets = await Ticket.find({ organization: req.orgId }).sort({ createdAt: -1 }).limit(10);
      for (const t of tickets) {
        queryPayload.push({
          query: t.subject,
          ticket_id: t.ticketNumber,
          similarity_score: 0.32
        });
      }
    }

    const gapReport = await aiServiceClient.detectKnowledgeGaps(req.orgId, queryPayload);

    res.json({
      success: true,
      report: gapReport
    });
  } catch (error) {
    next(error);
  }
};

export const classifyDirect = async (req, res, next) => {
  try {
    const { subject, description } = req.body;
    if (!subject) {
      return res.status(400).json({ success: false, error: 'Subject is required' });
    }

    const result = await aiServiceClient.classifyTicket(subject, description || subject, 0);
    res.json({
      success: true,
      result
    });
  } catch (error) {
    next(error);
  }
};
