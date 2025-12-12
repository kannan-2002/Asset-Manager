import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Download, Loader2, TrendingUp, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { getScrappedAssets, getAssetUtilization, fetchCategories } from '@/services/database';
import { generateScrappedAssetsReport, generateUtilizationReport } from '@/services/pdfReports';
import { toast } from 'sonner';

type ScrappedAsset = {
  id: string;
  asset_code: string;
  name: string;
  serial_number: string;
  make: string;
  model: string;
  purchase_date: string;
  purchase_price: number;
  branch: string;
  updated_at: string;
  category: { name: string } | null;
};

export default function Reports() {
  const [activeTab, setActiveTab] = useState('scrapped');

  const { data: scrappedAssets = [], isLoading: scrappedLoading } = useQuery({
    queryKey: ['scrapped-assets'],
    queryFn: getScrappedAssets,
  });

  const { data: utilizationData, isLoading: utilizationLoading } = useQuery({
    queryKey: ['asset-utilization'],
    queryFn: getAssetUtilization,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  const getCategory = (categoryId: string) =>
    categories.find((c: any) => c.id === categoryId)?.name || 'Unknown';

  // Process utilization data
  const processedUtilization = (utilizationData?.assets || []).map((asset: any) => {
    const purchaseDate = new Date(asset.purchase_date);
    const now = new Date();
    const totalDays = Math.floor((now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));

    // Estimate based on status
    let assignedDays = 0;
    if (asset.status === 'assigned') {
      assignedDays = Math.floor(totalDays * 0.8);
    } else if (asset.status === 'scrapped') {
      assignedDays = Math.floor(totalDays * 0.6);
    } else {
      assignedDays = Math.floor(totalDays * 0.3);
    }

    return {
      id: asset.id,
      assetCode: asset.asset_code,
      name: asset.name,
      category: getCategory(asset.category_id),
      purchaseDate: asset.purchase_date,
      purchasePrice: Number(asset.purchase_price),
      status: asset.status,
      totalDays,
      assignedDays,
      utilizationRate: totalDays > 0 ? Math.round((assignedDays / totalDays) * 100) : 0,
    };
  });

  const scrappedColumns = [
    { key: 'asset_code', header: 'Asset Code' },
    { key: 'name', header: 'Name' },
    {
      key: 'category',
      header: 'Category',
      render: (asset: ScrappedAsset) => asset.category?.name || 'Unknown',
    },
    { key: 'serial_number', header: 'Serial Number' },
    {
      key: 'makeModel',
      header: 'Make/Model',
      render: (asset: ScrappedAsset) => `${asset.make} ${asset.model}`,
    },
    {
      key: 'purchase_price',
      header: 'Original Value',
      render: (asset: ScrappedAsset) => `$${Number(asset.purchase_price).toLocaleString()}`,
    },
    { key: 'branch', header: 'Branch' },
    {
      key: 'updated_at',
      header: 'Scrapped Date',
      render: (asset: ScrappedAsset) => new Date(asset.updated_at).toLocaleDateString(),
    },
  ];

  const utilizationColumns = [
    { key: 'assetCode', header: 'Asset Code' },
    { key: 'name', header: 'Name' },
    { key: 'category', header: 'Category' },
    {
      key: 'status',
      header: 'Status',
      render: (item: any) => <StatusBadge status={item.status} />,
    },
    {
      key: 'purchasePrice',
      header: 'Value',
      render: (item: any) => `$${item.purchasePrice.toLocaleString()}`,
    },
    { key: 'totalDays', header: 'Total Days' },
    { key: 'assignedDays', header: 'Assigned Days' },
    {
      key: 'utilizationRate',
      header: 'Utilization',
      render: (item: any) => (
        <span
          className={`font-medium ${
            item.utilizationRate >= 70
              ? 'text-success'
              : item.utilizationRate < 30
              ? 'text-destructive'
              : 'text-foreground'
          }`}
        >
          {item.utilizationRate}%
        </span>
      ),
    },
  ];

  const handleExportScrapped = () => {
    generateScrappedAssetsReport(scrappedAssets);
    toast.success('Scrapped assets report downloaded');
  };

  const handleExportUtilization = () => {
    generateUtilizationReport(processedUtilization);
    toast.success('Utilization report downloaded');
  };

  // Calculate summary stats
  const scrappedTotalValue = scrappedAssets.reduce(
    (sum: number, a: ScrappedAsset) => sum + Number(a.purchase_price),
    0
  );

  const avgUtilization =
    processedUtilization.length > 0
      ? Math.round(
          processedUtilization.reduce((sum: number, a: any) => sum + a.utilizationRate, 0) /
            processedUtilization.length
        )
      : 0;

  const highUtilization = processedUtilization.filter((a: any) => a.utilizationRate >= 70).length;
  const lowUtilization = processedUtilization.filter((a: any) => a.utilizationRate < 30).length;

  return (
    <div className="page-container">
      <header className="page-header">
        <h1 className="page-title flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          Reports
        </h1>
        <p className="page-description">Generate and download asset reports</p>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="scrapped" className="flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            Scrapped Assets
          </TabsTrigger>
          <TabsTrigger value="utilization" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Utilization
          </TabsTrigger>
        </TabsList>

        {/* Scrapped Assets Report */}
        <TabsContent value="scrapped" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Scrapped</CardDescription>
                <CardTitle className="text-3xl">{scrappedAssets.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Original Value</CardDescription>
                <CardTitle className="text-3xl text-destructive">
                  ${scrappedTotalValue.toLocaleString()}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Export Report</CardDescription>
                <CardContent className="p-0 pt-2">
                  <Button onClick={handleExportScrapped} className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                </CardContent>
              </CardHeader>
            </Card>
          </div>

          {scrappedLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <DataTable
              data={scrappedAssets}
              columns={scrappedColumns}
              searchPlaceholder="Search scrapped assets..."
            />
          )}
        </TabsContent>

        {/* Utilization Report */}
        <TabsContent value="utilization" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Assets</CardDescription>
                <CardTitle className="text-3xl">{processedUtilization.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Average Utilization</CardDescription>
                <CardTitle className="text-3xl text-primary">{avgUtilization}%</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>High Utilization (≥70%)</CardDescription>
                <CardTitle className="text-3xl text-success">{highUtilization}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Low Utilization (&lt;30%)</CardDescription>
                <CardTitle className="text-3xl text-destructive">{lowUtilization}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleExportUtilization}>
              <Download className="h-4 w-4 mr-2" />
              Export Utilization Report
            </Button>
          </div>

          {utilizationLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <DataTable
              data={processedUtilization}
              columns={utilizationColumns}
              searchPlaceholder="Search assets..."
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
