import { Router } from 'express';
import { isAuthenticated } from '../replitAuth';
import { storage } from '../storage';
import { insertWebhookIntegrationSchema } from '@shared/schema';
import { webhookService } from '../services/webhook-service';
import { z } from 'zod';

const router = Router();

// Get user's webhook integrations
router.get('/webhooks', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const webhooks = await storage.getWebhookIntegrationsByUser(userId);
    res.json(webhooks);
  } catch (error) {
    console.error('Error fetching webhooks:', error);
    res.status(500).json({ message: 'Failed to fetch webhooks' });
  }
});

// Create new webhook integration
router.post('/webhooks', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    
    // Validate request body
    const validatedData = insertWebhookIntegrationSchema.parse({
      ...req.body,
      userId
    });

    const webhook = await storage.createWebhookIntegration(validatedData);
    res.status(201).json(webhook);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid webhook data', errors: error.errors });
    }
    console.error('Error creating webhook:', error);
    res.status(500).json({ message: 'Failed to create webhook' });
  }
});

// Update webhook integration
router.put('/webhooks/:id', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const webhookId = req.params.id;
    
    // Check if webhook belongs to user
    const existingWebhook = await storage.getWebhookIntegration(webhookId);
    if (!existingWebhook || existingWebhook.userId !== userId) {
      return res.status(404).json({ message: 'Webhook not found' });
    }

    const updatedWebhook = await storage.updateWebhookIntegration(webhookId, req.body);
    res.json(updatedWebhook);
  } catch (error) {
    console.error('Error updating webhook:', error);
    res.status(500).json({ message: 'Failed to update webhook' });
  }
});

// Delete webhook integration
router.delete('/webhooks/:id', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const webhookId = req.params.id;
    
    // Check if webhook belongs to user
    const existingWebhook = await storage.getWebhookIntegration(webhookId);
    if (!existingWebhook || existingWebhook.userId !== userId) {
      return res.status(404).json({ message: 'Webhook not found' });
    }

    await storage.deleteWebhookIntegration(webhookId);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting webhook:', error);
    res.status(500).json({ message: 'Failed to delete webhook' });
  }
});

// Test webhook
router.post('/webhooks/:id/test', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const webhookId = req.params.id;
    
    const result = await webhookService.testWebhook(webhookId, userId);
    res.json(result);
  } catch (error) {
    console.error('Error testing webhook:', error);
    res.status(500).json({ message: 'Failed to test webhook' });
  }
});

export default router;