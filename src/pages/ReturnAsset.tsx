import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RotateCcw, Package, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchAssets, fetchEmployees, fetchCategories, returnAsset } from '@/services/database';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type ReturnReason = Database['public']['Enums']['return_reason'];

const returnReasons: { value: ReturnReason; label: string }[] = [
  { value: 'upgrade', label: 'Upgrade' },
  { value: 'repair', label: 'Repair' },
  { value: 'resignation', label: 'Resignation' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'other', label: 'Other' },
];

type Asset = {
  id: string;
  asset_code: string;
  serial_number: string;
  name: string;
  category_id: string;
  make: string;
  model: string;
  purchase_price: number;
  status: string;
  current_assignee_id: string | null;
  current_assignee: { id: string; first_name: string; last_name: string; department: string; branch: string } | null;
};

type Category = {
  id: string;
  name: string;
};

export default function ReturnAsset() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [returnReason, setReturnReason] = useState<ReturnReason | ''>('');
  const [notes, setNotes] = useState('');

  const { data: assets = [], isLoading: assetsLoading } = useQuery({
    queryKey: ['assets'],
    queryFn: fetchAssets,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  const returnMutation = useMutation({
    mutationFn: () =>
      returnAsset(selectedAssetId, returnReason as ReturnReason, notes || null, user?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['asset-history'] });
      setSelectedAssetId('');
      setReturnReason('');
      setNotes('');
      toast.success('Asset returned successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to return asset');
    },
  });

  const assignedAssets = assets.filter((a: Asset) => a.status === 'assigned');
  const selectedAsset = assets.find((a: Asset) => a.id === selectedAssetId);

  const getCategory = (categoryId: string) =>
    categories.find((c: Category) => c.id === categoryId)?.name || 'Unknown';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId || !returnReason) {
      toast.error('Please select an asset and provide a return reason');
      return;
    }
    returnMutation.mutate();
  };

  if (assetsLoading) {
    return (
      <div className="page-container flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <h1 className="page-title flex items-center gap-2">
          <RotateCcw className="h-6 w-6 text-primary" />
          Return Asset
        </h1>
        <p className="page-description">Process asset returns from employees</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Return Form */}
        <Card className="lg:col-span-2 animate-fade-in">
          <CardHeader>
            <CardTitle>Return Details</CardTitle>
            <CardDescription>Select an assigned asset to process its return</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="asset">Select Assigned Asset</Label>
                <Select onValueChange={setSelectedAssetId} value={selectedAssetId}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Choose an assigned asset" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignedAssets.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No assigned assets
                      </SelectItem>
                    ) : (
                      assignedAssets.map((asset: Asset) => (
                        <SelectItem key={asset.id} value={asset.id}>
                          {asset.asset_code} - {asset.name} (Assigned to:{' '}
                          {asset.current_assignee?.first_name} {asset.current_assignee?.last_name})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="reason">Return Reason</Label>
                <Select onValueChange={(v) => setReturnReason(v as ReturnReason)} value={returnReason}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select reason for return" />
                  </SelectTrigger>
                  <SelectContent>
                    {returnReasons.map((reason) => (
                      <SelectItem key={reason.value} value={reason.value}>
                        {reason.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional details about the return..."
                  rows={3}
                  className="mt-1.5"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={!selectedAssetId || !returnReason || returnMutation.isPending}
              >
                {returnMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Process Return
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Preview Panel */}
        <div className="space-y-4">
          {/* Asset Preview */}
          <Card className="animate-slide-up">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                Asset Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedAsset ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Code:</span>
                    <span className="font-medium">{selectedAsset.asset_code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span className="font-medium">{selectedAsset.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Serial:</span>
                    <span className="font-mono text-xs">{selectedAsset.serial_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Category:</span>
                    <span>{getCategory(selectedAsset.category_id)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Value:</span>
                    <span className="font-medium">
                      ${Number(selectedAsset.purchase_price).toLocaleString()}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm text-center py-4">No asset selected</p>
              )}
            </CardContent>
          </Card>

          {/* Employee Preview */}
          <Card className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Current Assignee
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedAsset?.current_assignee ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span className="font-medium">
                      {selectedAsset.current_assignee.first_name}{' '}
                      {selectedAsset.current_assignee.last_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Department:</span>
                    <span>{selectedAsset.current_assignee.department}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Branch:</span>
                    <span>{selectedAsset.current_assignee.branch}</span>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm text-center py-4">
                  No assignee information
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
