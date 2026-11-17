import { Message } from '../models/Message.js';
import { Ticket } from '../models/Ticket.js';
import { Conversation } from '../models/Conversation.js';
import { aiServiceClient } from '../services/aiServiceClient.js';

export const sendMessage = async (req, res, next) => {
  try {
    const { ticketId, content, isInternalNote = false } = req.body;

    if (!ticketId || !content) {
      return res.status(400).json({ success: false, error: 'Ticket ID and message content are required.' });
    }

    const ticket = await Ticket.findOne({
      _id: ticketId,
      organization: req.orgId
    });

    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    // Role check for customer
    if (req.user.role === 'customer' && ticket.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Not authorized to send messages on this ticket.' });
    }

    // Create Message
    const message = await Message.create({
      ticket: ticket._id,
      organization: req.orgId,
      sender: req.user._id,
      senderRole: req.user.role,
      content,
      isInternalNote: req.user.role === 'customer' ? false : Boolean(isInternalNote)
    });

    const populatedMessage = await Message.findById(message._id).populate('sender', 'name email role avatar');

    // Update ticket status if appropriate
    if (req.user.role === 'customer') {
      if (ticket.status === 'Waiting for Customer' || ticket.status === 'Resolved') {
        ticket.status = 'In Progress';
      }
    } else if (req.user.role !== 'customer' && !isInternalNote) {
      if (ticket.status === 'New' || ticket.status === 'Open') {
        ticket.status = 'Waiting for Customer';
      }
    }
    await ticket.save();

    // Trigger Conversation Summarization in background
    setTimeout(async () => {
      try {
        const allMessages = await Message.find({ ticket: ticket._id, isInternalNote: false }).sort({ createdAt: 1 });
        const summaryData = await aiServiceClient.summarizeConversation(
          ticket._id.toString(),
          allMessages.map(m => ({
            sender: m.sender.toString(),
            role: m.senderRole,
            content: m.content
          }))
        );

        await Conversation.findOneAndUpdate(
          { ticket: ticket._id },
          {
            organization: req.orgId,
            summary: summaryData.summary,
            originalProblem: summaryData.original_problem,
            troubleshootingAttempted: summaryData.troubleshooting_attempted,
            unresolvedQuestions: summaryData.unresolved_questions,
            promisesMade: summaryData.promises_made,
            suggestedNextAction: summaryData.suggested_next_action,
            lastSummarizedAt: new Date()
          },
          { upsert: true, new: true }
        );
      } catch (sumErr) {
        console.warn('[Summarizer Warning]:', sumErr.message);
      }
    }, 100);

    // Socket.io emission
    if (req.app.get('io')) {
      req.app.get('io').to(req.orgId).emit('message:new', {
        ticketId: ticket._id,
        message: populatedMessage
      });
    }

    res.status(201).json({
      success: true,
      message: populatedMessage
    });
  } catch (error) {
    next(error);
  }
};

export const getConversationSummary = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    let conversation = await Conversation.findOne({ ticket: ticketId, organization: req.orgId });

    if (!conversation) {
      const allMessages = await Message.find({ ticket: ticketId, isInternalNote: false }).sort({ createdAt: 1 });
      const summaryData = await aiServiceClient.summarizeConversation(
        ticketId,
        allMessages.map(m => ({
          sender: m.sender.toString(),
          role: m.senderRole,
          content: m.content
        }))
      );

      conversation = await Conversation.create({
        ticket: ticketId,
        organization: req.orgId,
        summary: summaryData.summary,
        originalProblem: summaryData.original_problem,
        troubleshootingAttempted: summaryData.troubleshooting_attempted,
        unresolvedQuestions: summaryData.unresolved_questions,
        promisesMade: summaryData.promises_made,
        suggestedNextAction: summaryData.suggested_next_action
      });
    }

    res.json({
      success: true,
      conversation
    });
  } catch (error) {
    next(error);
  }
};
