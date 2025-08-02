import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Webhook, Plus, Zap } from 'lucide-react';

interface QuickWebhookSetupProps {
  anomalyType?: string;
  riskScore?: number;
}

export function QuickWebhookSetup({ anomalyType, riskScore }: QuickWebhookSetupProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: anomalyType ? `${anomalyType} Alert` : 'Security Alert',
    provider: 'zapier',
    webhookUrl: '',
    minRiskScore: riskScore || 7,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          isActive: true,
          triggerConditions: {
            minRiskScore: data.minRiskScore,
            anomalyTypes: anomalyType ? [anomalyType] : [],
            priorities: ['high', 'critical'],
          },
        }),
      });
      if (!response.ok) throw new Error('Failed to create webhook');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Webhook created successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/webhooks'] });
      setIsOpen(false);
      setFormData({
        name: anomalyType ? `${anomalyType} Alert` : 'Security Alert',
        provider: 'zapier',
        webhookUrl: '',
        minRiskScore: riskScore || 7,
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to create webhook',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.webhookUrl) {
      toast({
        title: 'Webhook URL required',
        description: 'Please enter a valid webhook URL',
        variant: 'destructive',
      });
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Zap className="h-4 w-4" />
          Quick Webhook
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Quick Webhook Setup
          </DialogTitle>
          <DialogDescription>
            Create a webhook to automatically respond to similar anomalies
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Alert name"
              />
            </div>
            
            <div>
              <Label htmlFor="provider">Provider</Label>
              <Select
                value={formData.provider}
                onValueChange={(value) => setFormData(prev => ({ ...prev, provider: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zapier">Zapier</SelectItem>
                  <SelectItem value="make">Make</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="webhookUrl">Webhook URL</Label>
            <Input
              id="webhookUrl"
              type="url"
              value={formData.webhookUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, webhookUrl: e.target.value }))}
              placeholder="https://hooks.zapier.com/hooks/catch/..."
              required
            />
          </div>

          <div>
            <Label htmlFor="minRiskScore">Minimum Risk Score (0-10)</Label>
            <Input
              id="minRiskScore"
              type="number"
              min="0"
              max="10"
              step="0.1"
              value={formData.minRiskScore}
              onChange={(e) => setFormData(prev => ({ ...prev, minRiskScore: parseFloat(e.target.value) }))}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Only trigger for anomalies with risk score ≥ {formData.minRiskScore}
            </p>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Webhook'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}