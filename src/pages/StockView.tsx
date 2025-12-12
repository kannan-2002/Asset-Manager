import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Boxes, DollarSign, Loader2, Download } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getStockSummary, fetchCategories } from '@/services/database';
import { generateStockReport } from '@/services/pdfReports';
import { toast } from 'sonner';

const branches = ['Head Office', 'Branch A', 'Branch B', 'Branch C'];

export default function StockView() {
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const { data: stockData = [], isLoading: stockLoading } = useQuery({
    queryKey: ['stock-summary'],
    queryFn: getStockSummary,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  const processedStockData = useMemo(() => {
    const data: Record<
      string,
      Record<
        string,
        { available: number; assigned: number; repair: number; value: number; categoryName: string }
      >
    > = {};

    // Initialize data structure
    branches.forEach((branch) => {
      data[branch] = {};
      categories.forEach((cat: any) => {
        data[branch][cat.id] = { available: 0, assigned: 0, repair: 0, value: 0, categoryName: cat.name };
      });
    });

    // Populate with asset data
    stockData.forEach((asset: any) => {
      const branchData = data[asset.branch]?.[asset.category?.id];
      if (branchData) {
        if (asset.status === 'available') branchData.available++;
        if (asset.status === 'assigned') branchData.assigned++;
        if (asset.status === 'repair') branchData.repair++;
        branchData.value += Number(asset.purchase_price);
      }
    });

    return data;
  }, [stockData, categories]);

  const filteredBranches = branchFilter === 'all' ? branches : [branchFilter];
  const filteredCategories =
    categoryFilter === 'all'
      ? categories
      : categories.filter((c: any) => c.id === categoryFilter);

  const totals = useMemo(() => {
    let available = 0;
    let assigned = 0;
    let repair = 0;
    let value = 0;

    filteredBranches.forEach((branch) => {
      filteredCategories.forEach((cat: any) => {
        const data = processedStockData[branch]?.[cat.id];
        if (data) {
          available += data.available;
          assigned += data.assigned;
          repair += data.repair;
          value += data.value;
        }
      });
    });

    return { available, assigned, repair, value };
  }, [processedStockData, filteredBranches, filteredCategories]);

  const handleExportPDF = () => {
    const reportData: Array<{
      branch: string;
      category: string;
      available: number;
      assigned: number;
      repair: number;
      value: number;
    }> = [];

    filteredBranches.forEach((branch) => {
      filteredCategories.forEach((cat: any) => {
        const data = processedStockData[branch]?.[cat.id];
        if (data && (data.available > 0 || data.assigned > 0 || data.repair > 0)) {
          reportData.push({
            branch,
            category: cat.name,
            available: data.available,
            assigned: data.assigned,
            repair: data.repair,
            value: data.value,
          });
        }
      });
    });

    generateStockReport(reportData);
    toast.success('Stock report downloaded');
  };

  if (stockLoading) {
    return (
      <div className="page-container flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="page-container">
      <header className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Boxes className="h-6 w-6 text-primary" />
            Stock View
          </h1>
          <p className="page-description">Bird's eye view of assets in stock by branch and category</p>
        </div>
        <Button onClick={handleExportPDF} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
      </header>

      {/* Filters */}
      <div className="filter-bar">
        <div className="flex items-center gap-2">
          <Label className="text-sm">Branch:</Label>
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches.map((branch) => (
                <SelectItem key={branch} value={branch}>
                  {branch}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm">Category:</Label>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat: any) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stock Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden animate-fade-in">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Branch</th>
                <th>Category</th>
                <th className="text-center">Available</th>
                <th className="text-center">Assigned</th>
                <th className="text-center">In Repair</th>
                <th className="text-right">Total Value</th>
              </tr>
            </thead>
            <tbody>
              {filteredBranches.map((branch) =>
                filteredCategories.map((cat: any, catIndex: number) => {
                  const data = processedStockData[branch]?.[cat.id];
                  const total =
                    (data?.available || 0) + (data?.assigned || 0) + (data?.repair || 0);

                  if (total === 0) return null;

                  return (
                    <tr key={`${branch}-${cat.id}`}>
                      <td className="font-medium">{catIndex === 0 ? branch : ''}</td>
                      <td>{cat.name}</td>
                      <td className="text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-success/10 text-success text-sm font-medium">
                          {data?.available || 0}
                        </span>
                      </td>
                      <td className="text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-medium">
                          {data?.assigned || 0}
                        </span>
                      </td>
                      <td className="text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-warning/10 text-warning text-sm font-medium">
                          {data?.repair || 0}
                        </span>
                      </td>
                      <td className="text-right font-medium">
                        ${(data?.value || 0).toLocaleString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot>
              <tr className="bg-muted/50 font-semibold">
                <td colSpan={2} className="text-right">
                  <span className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-primary" />
                    Totals
                  </span>
                </td>
                <td className="text-center">
                  <span className="inline-flex items-center justify-center min-w-[32px] h-8 px-2 rounded-full bg-success/20 text-success font-bold">
                    {totals.available}
                  </span>
                </td>
                <td className="text-center">
                  <span className="inline-flex items-center justify-center min-w-[32px] h-8 px-2 rounded-full bg-primary/20 text-primary font-bold">
                    {totals.assigned}
                  </span>
                </td>
                <td className="text-center">
                  <span className="inline-flex items-center justify-center min-w-[32px] h-8 px-2 rounded-full bg-warning/20 text-warning font-bold">
                    {totals.repair}
                  </span>
                </td>
                <td className="text-right text-lg">${totals.value.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
        <div className="stat-card border-l-4 border-l-success">
          <p className="stat-label">Available for Issue</p>
          <p className="stat-value text-success">{totals.available}</p>
        </div>
        <div className="stat-card border-l-4 border-l-primary">
          <p className="stat-label">Currently Assigned</p>
          <p className="stat-value text-primary">{totals.assigned}</p>
        </div>
        <div className="stat-card border-l-4 border-l-warning">
          <p className="stat-label">Under Repair</p>
          <p className="stat-value text-warning">{totals.repair}</p>
        </div>
        <div className="stat-card border-l-4 border-l-foreground">
          <p className="stat-label">Total Stock Value</p>
          <p className="stat-value">${totals.value.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
