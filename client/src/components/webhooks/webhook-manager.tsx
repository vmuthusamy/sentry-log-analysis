import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Webhook, Settings, Trash2, TestTube, Plus, ExternalLink } from 'lucide-react';

const webhookFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  provider: z.string().default('zapier'),
  webhookUrl: z.string().url('Must be a valid URL'),
  isActive: z.boolean().default(true),
  triggerConditions: z.object({
    minRiskScore: z.number().min(0).max(10).optional(),
    anomalyTypes: z.array(z.string()).optional(),
    priorities: z.array(z.string()).optional(),
    keywords: z.array(z.string()).optional(),
  }),
  payloadTemplate: z.object({}).optional(),
});

type WebhookFormData = z.infer<typeof webhookFormSchema>;

export function WebhookManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<any>(null);

  const form = useForm<WebhookFormData>({
    resolver: zodResolver(webhookFormSchema),
    defaultValues: {
      name: '',
      provider: 'zapier',
      webhookUrl: '',
      isActive: true,
      triggerConditions: {
        minRiskScore: 5,
        anomalyTypes: [],
        priorities: ['high', 'critical'],
        keywords: [],
      },
    },
  });

  // Fetch webhooks
  const { data: webhooks = [], isLoading } = useQuery({
    queryKey: ['/api/webhooks'],
    queryFn: async () => {
      const response = await fetch('/api/webhooks');
      if (!response.ok) throw new Error('Failed to fetch webhooks');
      return response.json();
    },
  });

  // Create webhook mutation
  const createMutation = useMutation({
    mutationFn: async (data: WebhookFormData) => {
      const response = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create webhook');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Webhook created successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/webhooks'] });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: 'Failed to create webhook',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });

  // Update webhook mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<WebhookFormData> }) => {
      const response = await fetch(`/api/webhooks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update webhook');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Webhook updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/webhooks'] });
      setEditingWebhook(null);
    },
    onError: (error) => {
      toast({
        title: 'Failed to update webhook',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });

  // Delete webhook mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/webhooks/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete webhook');
      return response.ok;
    },
    onSuccess: () => {
      toast({ title: 'Webhook deleted successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/webhooks'] });
    },
    onError: (error) => {
      toast({
        title: 'Failed to delete webhook',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });

  // Test webhook mutation
  const testMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/webhooks/${id}/test`, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to test webhook');
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: data.success ? 'Webhook test successful' : 'Webhook test failed',
        description: data.message,
        variant: data.success ? 'default' : 'destructive',
      });
    },
    onError: (error) => {
      toast({
        title: 'Webhook test failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: WebhookFormData) => {
    if (editingWebhook) {
      updateMutation.mutate({ id: editingWebhook.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (webhook: any) => {
    setEditingWebhook(webhook);
    form.reset({
      name: webhook.name,
      provider: webhook.provider,
      webhookUrl: webhook.webhookUrl,
      isActive: webhook.isActive,
      triggerConditions: webhook.triggerConditions || {},
    });
    setIsCreateDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsCreateDialogOpen(false);
    setEditingWebhook(null);
    form.reset();
  };

  if (isLoading) {
    return <div>Loading webhooks...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Webhook Integrations</h3>
          <p className="text-sm text-muted-foreground">
            Automate responses to anomalies with external workflow tools like Zapier
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Webhook
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingWebhook ? 'Edit Webhook' : 'Create New Webhook'}
              </DialogTitle>
              <DialogDescription>
                Connect external tools to automatically respond to security anomalies
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Security Alert Webhook" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="provider"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Provider</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="zapier">Zapier</SelectItem>
                            <SelectItem value="make">Make (Integromat)</SelectItem>
                            <SelectItem value="custom">Custom Webhook</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="webhookUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Webhook URL</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://hooks.zapier.com/hooks/catch/..." 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        The URL that will receive the webhook payload when anomalies match your conditions
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Active</FormLabel>
                        <FormDescription>
                          Enable this webhook to trigger on matching anomalies
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="space-y-3">
                  <h4 className="font-medium">Trigger Conditions</h4>
                  
                  <FormField
                    control={form.control}
                    name="triggerConditions.minRiskScore"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minimum Risk Score (0-10)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            max="10" 
                            step="0.1"
                            placeholder="5.0"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormDescription>
                          Only trigger for anomalies with risk score above this threshold
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {editingWebhook ? 'Update' : 'Create'} Webhook
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {webhooks.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-6">
              <Webhook className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">No webhooks configured</h3>
              <p className="text-sm text-muted-foreground text-center mb-4">
                Set up webhooks to automatically trigger external workflows when anomalies are detected
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Webhook
              </Button>
            </CardContent>
          </Card>
        ) : (
          (webhooks as any[]).map((webhook: any) => (
            <Card key={webhook.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Webhook className="h-4 w-4" />
                    {webhook.name}
                    <Badge variant={webhook.isActive ? 'default' : 'secondary'}>
                      {webhook.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    <Badge variant="outline">{webhook.provider}</Badge>
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" />
                    {webhook.webhookUrl.slice(0, 50)}...
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testMutation.mutate(webhook.id)}
                    disabled={testMutation.isPending}
                  >
                    <TestTube className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(webhook)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteMutation.mutate(webhook.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  <p>Triggers: Risk ≥ {webhook.triggerConditions?.minRiskScore || 'any'}</p>
                  {webhook.lastTriggered && (
                    <p>Last triggered: {new Date(webhook.lastTriggered).toLocaleString()}</p>
                  )}
                  <p>Total triggers: {webhook.totalTriggers || 0}</p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}