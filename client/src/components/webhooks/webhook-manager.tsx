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
import { Webhook, Settings, Trash2, TestTube, Plus, ExternalLink, Globe, Copy } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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

      {/* Webhook Table */}
      <Card className="bg-dark-secondary border-slate-700">
        <CardContent className="p-0">
          {webhooks.length === 0 ? (
            <div className="p-12 text-center">
              <Webhook className="h-12 w-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No Webhooks Configured</h3>
              <p className="text-sm text-slate-400 mb-4">
                Set up your first webhook to automate responses to security anomalies
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Webhook
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-dark-tertiary/50">
                  <TableRow className="border-slate-700">
                    <TableHead className="text-slate-300">Status</TableHead>
                    <TableHead className="text-slate-300">Name</TableHead>
                    <TableHead className="text-slate-300">Provider</TableHead>
                    <TableHead className="text-slate-300">Webhook URL</TableHead>
                    <TableHead className="text-slate-300">Trigger Conditions</TableHead>
                    <TableHead className="text-slate-300">Statistics</TableHead>
                    <TableHead className="text-slate-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(webhooks as any[]).map((webhook: any) => (
                    <TableRow key={webhook.id} className="border-slate-700 hover:bg-dark-tertiary/30">
                      <TableCell>
                        <Badge 
                          className={webhook.isActive 
                            ? "bg-accent-green/20 text-accent-green border-0" 
                            : "bg-slate-700/50 text-slate-400 border-0"
                          }
                        >
                          {webhook.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-white font-medium">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-slate-400" />
                          {webhook.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-slate-700 text-slate-300 border-0">
                          {webhook.provider}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="bg-dark-primary p-2 rounded border border-slate-600">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-400 flex items-center">
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Webhook URL
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigator.clipboard.writeText(webhook.webhookUrl)}
                              className="text-slate-400 hover:text-white p-1"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                          <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap break-all bg-slate-900/50 p-2 rounded border mt-1">
                            {webhook.webhookUrl}
                          </pre>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          <div className="text-slate-300">
                            Risk Score: ≥ {webhook.triggerConditions?.minRiskScore || 'any'}
                          </div>
                          {webhook.triggerConditions?.priorities && (
                            <div className="text-slate-400">
                              Priorities: {webhook.triggerConditions.priorities.join(', ')}
                            </div>
                          )}
                          {webhook.triggerConditions?.anomalyTypes && webhook.triggerConditions.anomalyTypes.length > 0 && (
                            <div className="text-slate-400">
                              Types: {webhook.triggerConditions.anomalyTypes.slice(0, 2).join(', ')}
                              {webhook.triggerConditions.anomalyTypes.length > 2 && '...'}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          <div className="text-slate-300">
                            Triggers: {webhook.totalTriggers || 0}
                          </div>
                          {webhook.lastTriggered ? (
                            <div className="text-slate-400">
                              Last: {new Date(webhook.lastTriggered).toLocaleDateString()}
                            </div>
                          ) : (
                            <div className="text-slate-500">Never triggered</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => testMutation.mutate(webhook.id)}
                            disabled={testMutation.isPending}
                            className="text-accent-blue hover:text-blue-400 border-slate-600"
                          >
                            <TestTube className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(webhook)}
                            className="text-slate-400 hover:text-white border-slate-600"
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteMutation.mutate(webhook.id)}
                            disabled={deleteMutation.isPending}
                            className="text-red-400 hover:text-red-300 border-slate-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}