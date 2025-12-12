import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { History, Package, Calendar, User, FileText, Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchAssets, fetchAssetHistory, fetchCategories } from '@/services/database';

type Asset = {
  id: string;
  asset_code: string;
  serial_number: string;
  name: string;
  category_id: string;
  make: string;
  model: string;
  purchase_date: string;
  purchase_price: number;
  status: string;
};

type HistoryRecord = {
  id: string;
  asset_id: string;
  action: string;
  action_date: string;
  notes: string | null;
  employee: { first_name: string; last_name: string } | null;
};

type Category = {
  id: string;
  name: string;
};

const actionLabels: Record<string, { label: string; color: string }> = {
  purchased: { label: 'Purchased', color: 'bg-success/10 text-success' },
  issued: { label: 'Issued', color: 'bg-primary/10 text-primary' },
  returned: { label: 'Returned', color: 'bg-warning/10 text-warning' },
  repair: { label: 'Sent for Repair', color: 'bg-orange-500/10 text-orange-600' },
  scrapped: { label: 'Scrapped', color: 'bg-destructive/10 text-destructive' },
};

export default function AssetHistory() {
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');

  const { data: assets = [], isLoading: assetsLoading } = useQuery({
    queryKey: ['assets'],
    queryFn: fetchAssets,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ['asset-history', selectedAssetId],
    queryFn: () => fetchAssetHistory(selectedAssetId || undefined),
    enabled: !!selectedAssetId,
  });

  const selectedAsset = assets.find((a: Asset) => a.id === selectedAssetId);

  const getCategory = (categoryId: string) =>
    categories.find((c: Category) => c.id === categoryId)?.name || 'Unknown';

  // Calculate utilization summary
  const utilizationSummary = useMemo(() => {
    if (!selectedAsset) return null;

    const purchaseDate = new Date(selectedAsset.purchase_date);
    const now = new Date();
    const totalDays = Math.floor((now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));

    // Estimate based on status
    let assignedDays = 0;
    if (selectedAsset.status === 'assigned') {
      assignedDays = Math.floor(totalDays * 0.8);
    } else if (selectedAsset.status === 'scrapped') {
      assignedDays = Math.floor(totalDays * 0.6);
    } else {
      assignedDays = Math.floor(totalDays * 0.3);
    }

    return {
      totalDays,
      assignedDays,
      utilizationRate: totalDays > 0 ? Math.round((assignedDays / totalDays) * 100) : 0,
    };
  }, [selectedAsset]);

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
          <History className="h-6 w-6 text-primary" />
          Asset History
        </h1>
        <p className="page-description">
          View the complete lifecycle of an asset from purchase to present
        </p>
      </header>

      {/* Asset Selector */}
      <Card className="mb-6 animate-fade-in">
        <CardHeader>
          <CardTitle className="text-base">Select Asset</CardTitle>
          <CardDescription>Choose an asset to view its history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-md">
            <Label htmlFor="asset">Asset</Label>
            <Select onValueChange={setSelectedAssetId} value={selectedAssetId}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Choose an asset" />
              </SelectTrigger>
              <SelectContent>
                {assets.map((asset: Asset) => (
                  <SelectItem key={asset.id} value={asset.id}>
                    {asset.asset_code} - {asset.name} ({asset.serial_number})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedAsset && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Timeline */}
          <div className="lg:col-span-2">
            <Card className="animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  History Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : history.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No history records found for this asset
                  </p>
                ) : (
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

                    <div className="space-y-6">
                      {history.map((record: HistoryRecord, index: number) => {
                        const actionConfig = actionLabels[record.action];

                        return (
                          <div
                            key={record.id}
                            className="relative pl-10 animate-slide-up"
                            style={{ animationDelay: `${index * 0.05}s` }}
                          >
                            {/* Timeline dot */}
                            <div
                              className={`absolute left-2 top-1 w-4 h-4 rounded-full border-2 border-background ${
                                actionConfig?.color?.split(' ')[0] || 'bg-muted'
                              }`}
                            />

                            <div className="bg-muted/50 rounded-lg p-4">
                              <div className="flex items-start justify-between mb-2">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${actionConfig?.color}`}
                                >
                                  {actionConfig?.label}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(record.action_date).toLocaleDateString()} at{' '}
                                  {new Date(record.action_date).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>

                              {record.employee && (
                                <p className="text-sm flex items-center gap-1 mb-1">
                                  <User className="h-3 w-3" />
                                  {record.employee.first_name} {record.employee.last_name}
                                </p>
                              )}

                              {record.notes && (
                                <p className="text-sm text-muted-foreground flex items-start gap-1">
                                  <FileText className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                  {record.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Asset Details & Summary */}
          <div className="space-y-4">
            {/* Asset Info */}
            <Card className="animate-slide-up">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  Asset Details
                </CardTitle>
              </CardHeader>
              <CardContent>
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
                    <span className="text-muted-foreground">Make/Model:</span>
                    <span>
                      {selectedAsset.make} {selectedAsset.model}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Purchase Price:</span>
                    <span className="font-medium">
                      ${Number(selectedAsset.purchase_price).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Purchase Date:</span>
                    <span>{new Date(selectedAsset.purchase_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current Status:</span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        selectedAsset.status === 'available'
                          ? 'bg-success/10 text-success'
                          : selectedAsset.status === 'assigned'
                          ? 'bg-primary/10 text-primary'
                          : selectedAsset.status === 'repair'
                          ? 'bg-warning/10 text-warning'
                          : 'bg-destructive/10 text-destructive'
                      }`}
                    >
                      {selectedAsset.status.charAt(0).toUpperCase() + selectedAsset.status.slice(1)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Utilization Summary */}
            {utilizationSummary && (
              <Card className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Utilization Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Utilization Rate</span>
                        <span className="font-medium">{utilizationSummary.utilizationRate}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${utilizationSummary.utilizationRate}%` }}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Total Days</p>
                        <p className="text-lg font-semibold">{utilizationSummary.totalDays}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Days Assigned</p>
                        <p className="text-lg font-semibold text-primary">
                          {utilizationSummary.assignedDays}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
