import path from 'path';
import fs from 'fs';
import { KnowledgeDocument } from '../models/KnowledgeDocument.js';
import { AuditLog } from '../models/AuditLog.js';
import { aiServiceClient } from '../services/aiServiceClient.js';

export const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Please upload a document file (PDF, TXT, or DOCX).' });
    }

    const { title, category, description } = req.body;
    const fileExt = path.extname(req.file.originalname).toLowerCase().replace('.', '');
    const docTitle = title || path.parse(req.file.originalname).name;

    // 1. Create KnowledgeDocument record in MongoDB
    const doc = await KnowledgeDocument.create({
      organization: req.orgId,
      uploadedBy: req.user._id,
      title: docTitle,
      filename: req.file.filename,
      originalName: req.file.originalname,
      fileType: fileExt,
      fileSize: req.file.size,
      status: 'processing',
      category: category || 'General Policy',
      description: description || ''
    });

    try {
      // 2. Ingest into ChromaDB via AI Microservice
      const ingestResult = await aiServiceClient.ingestFile(
        req.orgId,
        doc._id.toString(),
        docTitle,
        req.file.path,
        req.file.originalname
      );

      doc.status = 'indexed';
      doc.chunkCount = ingestResult.chunks_created;
      await doc.save();
    } catch (ingestError) {
      doc.status = 'failed';
      doc.errorMessage = ingestError.message;
      await doc.save();
      throw ingestError;
    }

    await AuditLog.create({
      organization: req.orgId,
      user: req.user._id,
      action: 'KB_DOCUMENT_UPLOAD',
      entityType: 'KnowledgeDocument',
      entityId: doc._id.toString(),
      details: { title: doc.title, chunks: doc.chunkCount }
    });

    res.status(201).json({
      success: true,
      document: doc
    });
  } catch (error) {
    next(error);
  }
};

export const createDirectDocument = async (req, res, next) => {
  try {
    const { title, content, category, description } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, error: 'Title and content are required.' });
    }

    const doc = await KnowledgeDocument.create({
      organization: req.orgId,
      uploadedBy: req.user._id,
      title,
      filename: `direct_${Date.now()}.txt`,
      originalName: `${title}.txt`,
      fileType: 'txt',
      fileSize: Buffer.byteLength(content, 'utf8'),
      status: 'processing',
      category: category || 'General Policy',
      description: description || ''
    });

    const ingestResult = await aiServiceClient.ingestText(
      req.orgId,
      doc._id.toString(),
      title,
      content
    );

    doc.status = 'indexed';
    doc.chunkCount = ingestResult.chunks_created;
    await doc.save();

    res.status(201).json({
      success: true,
      document: doc
    });
  } catch (error) {
    next(error);
  }
};

export const getDocuments = async (req, res, next) => {
  try {
    const documents = await KnowledgeDocument.find({ organization: req.orgId })
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: documents.length,
      documents
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDocument = async (req, res, next) => {
  try {
    const doc = await KnowledgeDocument.findOne({
      _id: req.params.id,
      organization: req.orgId
    });

    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    // Delete chunks from ChromaDB
    await aiServiceClient.deleteDocumentChunks(req.orgId, doc._id.toString());

    // Remove local file if present
    const filePath = path.join(process.cwd(), 'uploads', doc.filename);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (e) {}
    }

    await doc.deleteOne();

    await AuditLog.create({
      organization: req.orgId,
      user: req.user._id,
      action: 'KB_DOCUMENT_DELETE',
      entityType: 'KnowledgeDocument',
      entityId: req.params.id,
      details: { title: doc.title }
    });

    res.json({
      success: true,
      message: 'Knowledge base document and vector index deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};

export const testRAGQuery = async (req, res, next) => {
  try {
    const { query, topK = 4, minSimilarity = 0.20 } = req.body;

    if (!query) {
      return res.status(400).json({ success: false, error: 'Query text is required.' });
    }

    const ragResults = await aiServiceClient.queryRAG(
      req.orgId,
      query,
      parseInt(topK, 10),
      parseFloat(minSimilarity)
    );

    res.json({
      success: true,
      query,
      results: ragResults
    });
  } catch (error) {
    next(error);
  }
};
