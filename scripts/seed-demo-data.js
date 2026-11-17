import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

import { Organization } from '../backend/src/models/Organization.js';
import { User } from '../backend/src/models/User.js';
import { Ticket } from '../backend/src/models/Ticket.js';
import { Message } from '../backend/src/models/Message.js';
import { Conversation } from '../backend/src/models/Conversation.js';
import { KnowledgeDocument } from '../backend/src/models/KnowledgeDocument.js';
import { AIAnalysis } from '../backend/src/models/AIAnalysis.js';
import { GeneratedResponse } from '../backend/src/models/GeneratedResponse.js';
import { Escalation } from '../backend/src/models/Escalation.js';
import { AuditLog } from '../backend/src/models/AuditLog.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/resolveai';
const AI_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const AI_SECRET = process.env.AI_SERVICE_SECRET || 'resolveai_internal_secret_key_2026';

const seedDatabase = async () => {
  try {
    console.log('[Seed] Connecting to MongoDB at:', MONGODB_URI);
    await mongoose.connect(MONGODB_URI);
    console.log('[Seed] Connected to MongoDB.');

    // Clean existing data for clean demo setup
    console.log('[Seed] Resetting existing collections...');
    await Promise.all([
      Organization.deleteMany({}),
      User.deleteMany({}),
      Ticket.deleteMany({}),
      Message.deleteMany({}),
      Conversation.deleteMany({}),
      KnowledgeDocument.deleteMany({}),
      AIAnalysis.deleteMany({}),
      GeneratedResponse.deleteMany({}),
      Escalation.deleteMany({}),
      AuditLog.deleteMany({})
    ]);

    // 1. Create Organization
    console.log('[Seed] Creating Organization...');
    const org = await Organization.create({
      name: 'TechNova Global',
      slug: 'technova',
      slaConfig: {
        lowHours: 48,
        mediumHours: 24,
        highHours: 8,
        criticalHours: 2
      },
      categories: [
        'Billing & Payments',
        'Account & Access',
        'Shipping & Delivery',
        'Technical Support',
        'Product & Feature',
        'General Inquiry'
      ],
      aiSettings: {
        autoClassify: true,
        autoDraftResponse: true,
        defaultTone: 'Professional',
        minConfidenceThreshold: 0.25
      }
    });

    // 2. Create Users
    console.log('[Seed] Creating Users...');
    const adminUser = await User.create({
      organization: org._id,
      name: 'Sarah Chen',
      email: 'admin@technova.com',
      password: 'adminpassword123',
      role: 'admin',
      department: 'Platform Operations',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'
    });

    const supervisorUser = await User.create({
      organization: org._id,
      name: 'Marcus Vance',
      email: 'supervisor@technova.com',
      password: 'supervisorpassword123',
      role: 'supervisor',
      department: 'Customer Success Leadership',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
    });

    const agent1 = await User.create({
      organization: org._id,
      name: 'Alex Rivera',
      email: 'agent@technova.com',
      password: 'agentpassword123',
      role: 'agent',
      department: 'Tier-2 Support Specialist',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'
    });

    const agent2 = await User.create({
      organization: org._id,
      name: 'Elena Rostova',
      email: 'elena@technova.com',
      password: 'agentpassword123',
      role: 'agent',
      department: 'Technical Support Engineer',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
    });

    const customer1 = await User.create({
      organization: org._id,
      name: 'David Miller',
      email: 'customer@gmail.com',
      password: 'customerpassword123',
      role: 'customer',
      avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150'
    });

    const customer2 = await User.create({
      organization: org._id,
      name: 'Priya Sharma',
      email: 'priya@gmail.com',
      password: 'customerpassword123',
      role: 'customer',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'
    });

    // 3. Create Knowledge Base Documents & Ingest to ChromaDB
    console.log('[Seed] Creating and Indexing Knowledge Base Documents in ChromaDB...');

    const kbDocsData = [
      {
        title: 'Refund and Cancellation Policy',
        category: 'Billing & Payments',
        description: 'Official standard policies for product returns, payment reversals, and double-charge reconciliation.',
        content: `
# TECHNOVA REFUND AND RETURN POLICY

1. 30-Day Money Back Guarantee:
Customers may request a complete refund for digital products and standard software subscriptions within 30 days of initial purchase. No penalties apply if requested within this window.

2. Processing Timelines:
Approved refunds are transmitted back to the original funding source (credit card, debit card, or bank account) within 3 to 5 business days. The timing depends on the acquiring banking institution.

3. Payment Deductions and Double Charges:
If your bank account reflects a deduction but the order status remains "Pending" or unconfirmed, our automated reconciliation system releases the temporary pre-authorization hold within 24 to 48 hours. If the duplicate transaction settles, submitting a transaction receipt guarantees immediate manual reversal by our finance department.

4. Non-Refundable Services:
Custom enterprise onboarding services, dedicated architecture consulting hours, and consumed third-party API token overages are strictly non-refundable once work has commenced.
        `.trim()
      },
      {
        title: 'Account Security and Two-Factor Authentication Guide',
        category: 'Account & Access',
        description: 'Protocols for account recovery, password changes, MFA resets, and lockout overrides.',
        content: `
# TECHNOVA ACCOUNT SECURITY AND AUTHENTICATION PROTOCOL

1. Password Reset Procedures:
Users can initiate a secure password reset via the self-service portal. Reset links expire within 15 minutes for cryptographic security. Passwords must contain a minimum of 10 characters including uppercase, lowercase, numbers, and symbols.

2. Two-Factor Authentication (2FA / MFA) Recovery:
If a user loses access to their authenticator device, they can utilize one of their 10 emergency one-time recovery codes generated during initial enrollment.
If backup recovery codes are lost, identity verification requires submitting an account verification form accompanied by government ID or verification through registered corporate domain DNS.

3. Account Lockout Policies:
Accounts undergo a mandatory 30-minute security lockdown following 5 consecutive failed authentication attempts. Support agents can manually unlock verified accounts after affirmative caller authentication.
        `.trim()
      },
      {
        title: 'Shipping and Delivery Timelines',
        category: 'Shipping & Delivery',
        description: 'Standard delivery schedules, express couriers, international customs, and lost package claims.',
        content: `
# TECHNOVA GLOBAL SHIPPING & LOGISTICS GUIDELINES

1. Standard Shipping:
Standard domestic transit requires 3 to 5 business days from dispatch. Tracking links are updated by our regional carriers within 24 hours of package handoff.

2. Express Delivery:
Express courier services guarantee delivery within 1 to 2 business days for orders confirmed prior to 2:00 PM EST.

3. Lost or Delayed Shipments:
If tracking status does not update for 5 consecutive business days past the estimated delivery date, customers are entitled to an immediate replacement dispatch or full refund upon submitting a lost shipment claim.
        `.trim()
      },
      {
        title: 'Enterprise Billing and Invoicing FAQ',
        category: 'Billing & Payments',
        description: 'Subscription tiers, annual discounts, payment terms, VAT/GST tax invoices, and wire transfers.',
        content: `
# TECHNOVA SUBSCRIPTION AND INVOICE MANAGEMENT

1. Annual Billing Discount:
Customers choosing annual upfront commitments receive a 20% discount applied immediately at checkout.

2. Invoices and Tax Compliance:
Tax-compliant PDF invoices featuring corporate VAT/GST identification numbers are automatically generated on the 1st of every calendar month and available under Organization Settings -> Invoices.

3. Wire Transfers and ACH:
Enterprise tiers supporting Net-30 payment terms can settle accounts through domestic ACH or international SWIFT wire transfers. Reconciliations require 2 business days after wire arrival.
        `.trim()
      }
    ];

    for (const docInfo of kbDocsData) {
      const kbDoc = await KnowledgeDocument.create({
        organization: org._id,
        uploadedBy: adminUser._id,
        title: docInfo.title,
        filename: `${docInfo.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.txt`,
        originalName: `${docInfo.title}.txt`,
        fileType: 'txt',
        fileSize: Buffer.byteLength(docInfo.content, 'utf8'),
        status: 'indexed',
        category: docInfo.category,
        description: docInfo.description,
        chunkCount: 3
      });

      // Index in AI service
      try {
        const formData = new FormData();
        formData.append('org_id', org._id.toString());
        formData.append('doc_id', kbDoc._id.toString());
        formData.append('title', docInfo.title);
        formData.append('content', docInfo.content);

        await axios.post(`${AI_URL}/api/rag/ingest-text`, formData, {
          headers: {
            'X-Service-Token': AI_SECRET
          },
          timeout: 5000
        });
        console.log(`[Seed] Ingested KB Doc to ChromaDB: "${docInfo.title}"`);
      } catch (err) {
        console.warn(`[Seed Warning] Could not ingest "${docInfo.title}" directly to AI service: ${err.message}. (AI service may be starting).`);
      }
    }

    // 4. Create Realistic Tickets with Conversations & AI Analyses
    console.log('[Seed] Creating demo tickets and AI analysis records...');

    const demoTickets = [
      {
        number: 'TIC-1042',
        customer: customer1,
        agent: agent1,
        subject: 'Payment deducted from bank account but order is still pending',
        description: 'I attempted to purchase the annual developer license earlier today. The amount of $240 was immediately deducted from my Chase checking account, but my account dashboard still displays order status as Pending. I urgently need access to the API keys for a client release tomorrow.',
        category: 'Billing & Payments',
        priority: 'High',
        status: 'In Progress',
        sentiment: 'Negative',
        intent: 'Payment Dispute / Deduction Verification',
        mainIssue: 'Payment deducted without order confirmation',
        urgency: 0.85,
        messages: [
          { role: 'customer', sender: customer1, content: 'I attempted to purchase the annual developer license earlier today. The amount of $240 was immediately deducted from my Chase checking account, but my account dashboard still displays order status as Pending. I urgently need access to the API keys for a client release tomorrow.' },
          { role: 'agent', sender: agent1, content: 'Hello David,\n\nThank you for reaching out. I see the temporary pre-authorization hold on our payment gateway. Under our Refund and Return Policy, when a deduction occurs without immediate confirmation, the temporary hold clears within 24 to 48 hours or converts to confirmed status once our bank settles the batch.\n\nI have manually verified your payment reference with our finance queue and upgraded your license immediately so your team can deploy tonight. You will receive your official invoice in your inbox shortly.' }
        ]
      },
      {
        number: 'TIC-1043',
        customer: customer2,
        agent: agent1,
        subject: 'Cannot access production server - 2FA device broken',
        description: 'My phone fell into water and the Google Authenticator app is gone. I do not have my emergency backup codes saved on this laptop. We have a production build scheduled in 3 hours and I cannot log into the TechNova deployment console!',
        category: 'Account & Access',
        priority: 'Critical',
        status: 'Escalated',
        isEscalated: true,
        escalatedReason: 'AI Priority Engine detected critical urgency: Customer locked out of production console without 2FA backup codes.',
        sentiment: 'Frustrated',
        intent: 'Account Recovery & Authentication',
        mainIssue: 'Locked out of production server due to lost 2FA device',
        urgency: 0.95,
        messages: [
          { role: 'customer', sender: customer2, content: 'My phone fell into water and the Google Authenticator app is gone. I do not have my emergency backup codes saved on this laptop. We have a production build scheduled in 3 hours and I cannot log into the TechNova deployment console!' },
          { role: 'agent', sender: agent1, content: 'Hi Priya,\n\nI understand the critical urgency of your deployment. As per our Account Security and Authentication Protocol, because one-time recovery codes are unavailable, we require verified identity validation to protect against account takeover.\n\nI have initiated an expedited security verification link to your corporate backup email. Please complete the quick face validation check and our security supervisor Marcus will release the MFA lock within 15 minutes.' }
        ]
      },
      {
        number: 'TIC-1044',
        customer: customer1,
        agent: agent2,
        subject: 'Tracking number shows parcel delivered but nothing arrived at my doorstep',
        description: 'The tracking link for my hardware security key order #8841 says delivered at 2:15 PM today, but I checked our front porch and reception desk and nothing was left. Can you please check with the courier company?',
        category: 'Shipping & Delivery',
        priority: 'Medium',
        status: 'Waiting for Customer',
        sentiment: 'Neutral',
        intent: 'Order Status & Shipment Inquiry',
        mainIssue: 'Package marked delivered but not received by customer',
        urgency: 0.50,
        messages: [
          { role: 'customer', sender: customer1, content: 'The tracking link for my hardware security key order #8841 says delivered at 2:15 PM today, but I checked our front porch and reception desk and nothing was left. Can you please check with the courier company?' },
          { role: 'agent', sender: agent2, content: 'Hello David,\n\nThank you for letting us know. Couriers occasionally scan packages as delivered when entering the neighborhood route. If the item does not appear by tomorrow noon, our Shipping Guidelines entitle you to an immediate replacement dispatch. Could you please confirm if your neighboring units might have accepted the delivery on your behalf?' }
        ]
      },
      {
        number: 'TIC-1045',
        customer: customer2,
        agent: null,
        subject: 'How do I download monthly VAT compliant tax invoices?',
        description: 'Our accounting department needs VAT/GST compliant tax invoices for January, February, and March for quarterly reporting. Where can I find them inside the billing dashboard?',
        category: 'Billing & Payments',
        priority: 'Low',
        status: 'Open',
        sentiment: 'Neutral',
        intent: 'Invoicing & Tax Document Retrieval',
        mainIssue: 'Request for VAT compliant monthly tax invoices',
        urgency: 0.25,
        messages: [
          { role: 'customer', sender: customer2, content: 'Our accounting department needs VAT/GST compliant tax invoices for January, February, and March for quarterly reporting. Where can I find them inside the billing dashboard?' }
        ]
      },
      {
        number: 'TIC-1046',
        customer: customer1,
        agent: agent2,
        subject: 'Inquiry on Enterprise SSO and SAML integration support',
        description: 'We are evaluating upgrading our entire engineering team to TechNova Enterprise. Does your system support Okta and Azure AD SAML 2.0 federation with just-in-time SCIM provisioning?',
        category: 'Product & Feature',
        priority: 'Medium',
        status: 'Open',
        sentiment: 'Positive',
        intent: 'Enterprise SSO & SAML Inquiry',
        mainIssue: 'Questions regarding Okta and Azure AD SSO integration',
        urgency: 0.45,
        messages: [
          { role: 'customer', sender: customer1, content: 'We are evaluating upgrading our entire engineering team to TechNova Enterprise. Does your system support Okta and Azure AD SAML 2.0 federation with just-in-time SCIM provisioning?' }
        ]
      },
      {
        number: 'TIC-1047',
        customer: customer2,
        agent: agent1,
        subject: 'Refund request for duplicate annual renewal charge',
        description: 'I was accidentally billed twice on my Mastercard for the annual renewal on May 1st. Please reverse the duplicate charge of $199.',
        category: 'Billing & Payments',
        priority: 'High',
        status: 'Resolved',
        sentiment: 'Negative',
        intent: 'Refund Request',
        mainIssue: 'Duplicate charge of $199 on Mastercard renewal',
        urgency: 0.75,
        resolvedAt: new Date(Date.now() - 3600000 * 4), // 4 hours ago
        messages: [
          { role: 'customer', sender: customer2, content: 'I was accidentally billed twice on my Mastercard for the annual renewal on May 1st. Please reverse the duplicate charge of $199.' },
          { role: 'agent', sender: agent1, content: 'Hello Priya,\n\nI have processed the full refund of $199 for the duplicate charge. In accordance with our Refund and Return Policy, the amount will reflect in your account within 3 to 5 business days. Your primary subscription remains fully active.' },
          { role: 'customer', sender: customer2, content: 'Thank you Alex! I just received the refund receipt email. Super fast resolution!' }
        ]
      }
    ];

    for (const tData of demoTickets) {
      const ticket = await Ticket.create({
        ticketNumber: tData.number,
        organization: org._id,
        customer: tData.customer._id,
        assignedAgent: tData.agent ? tData.agent._id : null,
        subject: tData.subject,
        description: tData.description,
        category: tData.category,
        priority: tData.priority,
        status: tData.status,
        sentiment: tData.sentiment,
        isEscalated: tData.isEscalated || false,
        escalatedReason: tData.escalatedReason || '',
        escalatedAt: tData.isEscalated ? new Date() : null,
        resolvedAt: tData.resolvedAt || null,
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 86400000 * 3))
      });

      // Messages
      for (const m of tData.messages) {
        await Message.create({
          ticket: ticket._id,
          organization: org._id,
          sender: m.sender._id,
          senderRole: m.role,
          content: m.content,
          createdAt: new Date(ticket.createdAt.getTime() + 1000 * 60 * 10)
        });
      }

      // AI Analysis
      await AIAnalysis.create({
        ticket: ticket._id,
        organization: org._id,
        intent: tData.intent,
        category: tData.category,
        priority: tData.priority,
        sentiment: tData.sentiment,
        mainIssue: tData.mainIssue,
        keywords: [tData.category.toLowerCase(), tData.priority.toLowerCase(), 'order', 'support'],
        urgencyScore: tData.urgency,
        confidence: 0.92
      });

      // Escalation if applicable
      if (tData.isEscalated) {
        await Escalation.create({
          ticket: ticket._id,
          organization: org._id,
          ruleTriggered: 'CRITICAL_URGENCY_AUTO_ESCALATION',
          reason: tData.escalatedReason,
          previousPriority: 'High',
          newPriority: 'Critical',
          triggeredBy: 'ai_engine',
          escalatedToSupervisor: supervisorUser._id
        });
      }

      // Conversation summary
      await Conversation.create({
        ticket: ticket._id,
        organization: org._id,
        summary: `Customer opened inquiry regarding "${tData.subject}". Status is currently ${tData.status}.`,
        originalProblem: tData.subject,
        suggestedNextAction: tData.status === 'Resolved' ? 'Ticket resolved and closed.' : 'Follow up with customer to confirm resolution.',
        troubleshootingAttempted: ['Verified payment gateway log', 'Checked knowledge base policy'],
        promisesMade: tData.status === 'Resolved' ? ['Refund of $199 issued'] : []
      });

      // Generated Draft Response
      await GeneratedResponse.create({
        ticket: ticket._id,
        organization: org._id,
        suggestedText: `Hello ${tData.customer.name},\n\nThank you for reaching out regarding "${tData.subject}". Based on our official knowledge documentation, we are actively processing your request with high priority. Please let us know if any additional details are required.\n\nBest regards,\nResolveAI Support Team`,
        tone: 'Professional',
        confidenceScore: 0.88,
        sufficientContext: true,
        modelProvider: 'ResolveAI Grounded Engine',
        status: tData.status === 'Resolved' ? 'approved' : 'draft',
        approvedText: tData.status === 'Resolved' ? 'Approved and sent to customer.' : '',
        approvedBy: tData.status === 'Resolved' ? agent1._id : null
      });
    }

    console.log('[Seed] Data seeding completed successfully!');
    console.log('[Seed] Demo Credentials:');
    console.log('   - Admin:      admin@technova.com / adminpassword123');
    console.log('   - Supervisor: supervisor@technova.com / supervisorpassword123');
    console.log('   - Agent:      agent@technova.com / agentpassword123');
    console.log('   - Customer:   customer@gmail.com / customerpassword123');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('[Seed Error]:', error);
    process.exit(1);
  }
};

seedDatabase();
