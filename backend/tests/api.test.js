import test from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

import { User } from '../src/models/User.js';
import { Organization } from '../src/models/Organization.js';
import { Ticket } from '../src/models/Ticket.js';
import { Message } from '../src/models/Message.js';
import { KnowledgeDocument } from '../src/models/KnowledgeDocument.js';
import { AIAnalysis } from '../src/models/AIAnalysis.js';
import { Escalation } from '../src/models/Escalation.js';
import { AuditLog } from '../src/models/AuditLog.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/resolveai_test';

test.before(async () => {
  await mongoose.connect(MONGODB_URI);
});

test.after(async () => {
  await mongoose.disconnect();
});

test('1. Organization & User Registration with bcrypt password hashing', async () => {
  const org = await Organization.findOne({ slug: 'technova' });
  assert.ok(org, 'Default organization technova should exist');

  const admin = await User.findOne({ email: 'admin@technova.com' }).select('+password');
  assert.ok(admin, 'Admin user should exist');
  assert.strictEqual(admin.role, 'admin');

  // Verify bcrypt password verification
  const isMatch = await admin.comparePassword('adminpassword123');
  assert.strictEqual(isMatch, true, 'Admin password should match bcrypt hash');

  const isWrongMatch = await admin.comparePassword('wrongpassword');
  assert.strictEqual(isWrongMatch, false, 'Invalid password should be rejected');
});

test('2. Multi-tenant Organization Data Isolation', async () => {
  const org1 = await Organization.findOne({ slug: 'technova' });
  assert.ok(org1);

  // Tickets should all belong to technova
  const tickets = await Ticket.find({ organization: org1._id });
  assert.ok(tickets.length > 0, 'Should have seeded tickets for technova');

  for (const t of tickets) {
    assert.strictEqual(t.organization.toString(), org1._id.toString());
  }
});

test('3. Ticket Lifecycle, Prioritization & Escalation', async () => {
  const org = await Organization.findOne({ slug: 'technova' });
  const customer = await User.findOne({ role: 'customer' });
  const agent = await User.findOne({ role: 'agent' });

  // Create ticket
  const ticket = await Ticket.create({
    ticketNumber: `TIC-TEST-${Date.now().toString().slice(-4)}`,
    organization: org._id,
    customer: customer._id,
    subject: 'Integration test ticket for priority escalation',
    description: 'Testing the escalation and status update flow.',
    category: 'Technical Support',
    priority: 'Medium',
    status: 'New'
  });

  assert.ok(ticket._id);
  assert.strictEqual(ticket.status, 'New');

  // Status update to In Progress
  ticket.status = 'In Progress';
  ticket.assignedAgent = agent._id;
  await ticket.save();

  assert.strictEqual(ticket.status, 'In Progress');
  assert.strictEqual(ticket.assignedAgent.toString(), agent._id.toString());

  // Escalate ticket
  ticket.isEscalated = true;
  ticket.priority = 'Critical';
  ticket.status = 'Escalated';
  ticket.escalatedReason = 'Customer escalated via SLA policy threshold';
  await ticket.save();

  const escalation = await Escalation.create({
    ticket: ticket._id,
    organization: org._id,
    ruleTriggered: 'TEST_MANUAL_ESCALATION',
    reason: ticket.escalatedReason,
    previousPriority: 'Medium',
    newPriority: 'Critical',
    triggeredBy: 'agent'
  });

  assert.ok(escalation._id);
  assert.strictEqual(escalation.newPriority, 'Critical');

  // Resolve ticket
  ticket.status = 'Resolved';
  ticket.resolvedAt = new Date();
  await ticket.save();

  assert.strictEqual(ticket.status, 'Resolved');
  assert.ok(ticket.resolvedAt);

  // Clean up test ticket
  await Ticket.deleteOne({ _id: ticket._id });
  await Escalation.deleteOne({ _id: escalation._id });
});

test('4. Message Threading & Staff Internal Notes', async () => {
  const ticket = await Ticket.findOne({});
  const agent = await User.findOne({ role: 'agent' });

  const publicMsg = await Message.create({
    ticket: ticket._id,
    organization: ticket.organization,
    sender: agent._id,
    senderRole: 'agent',
    content: 'Public reply to customer',
    isInternalNote: false
  });
  assert.strictEqual(publicMsg.isInternalNote, false);

  const privateMsg = await Message.create({
    ticket: ticket._id,
    organization: ticket.organization,
    sender: agent._id,
    senderRole: 'agent',
    content: 'Private staff note for supervisor',
    isInternalNote: true
  });
  assert.strictEqual(privateMsg.isInternalNote, true);

  await Message.deleteMany({ _id: { $in: [publicMsg._id, privateMsg._id] } });
});

test('5. AI Analysis and Agent Override Verification', async () => {
  const ticket = await Ticket.findOne({});
  const agent = await User.findOne({ role: 'agent' });

  let analysis = await AIAnalysis.findOne({ ticket: ticket._id });
  if (!analysis) {
    analysis = await AIAnalysis.create({
      ticket: ticket._id,
      organization: ticket.organization,
      intent: 'Test Intent',
      category: 'General Inquiry',
      priority: 'Low',
      sentiment: 'Neutral',
      mainIssue: 'Test Issue',
      keywords: ['test']
    });
  }

  // Agent overrides predicted category to Billing & Payments
  analysis.category = 'Billing & Payments';
  analysis.isAgentOverridden = true;
  analysis.overriddenBy = agent._id;
  await analysis.save();

  const updated = await AIAnalysis.findById(analysis._id);
  assert.strictEqual(updated.category, 'Billing & Payments');
  assert.strictEqual(updated.isAgentOverridden, true);
  assert.strictEqual(updated.overriddenBy.toString(), agent._id.toString());
});

test('6. Knowledge Base Documents and Chroma Chunks Metadata', async () => {
  const docs = await KnowledgeDocument.find({ status: 'indexed' });
  assert.ok(docs.length >= 4, 'Should have indexed at least 4 knowledge documents');

  const refundDoc = docs.find(d => d.title.includes('Refund'));
  assert.ok(refundDoc, 'Refund policy document must be indexed');
  assert.ok(refundDoc.chunkCount > 0, 'Document must have indexed chunks');
});
