import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ScrappedAsset {
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
}

interface AssetUtilizationData {
  assetCode: string;
  name: string;
  category: string;
  purchaseDate: string;
  purchasePrice: number;
  status: string;
  totalDays: number;
  assignedDays: number;
  utilizationRate: number;
}

export function generateScrappedAssetsReport(assets: ScrappedAsset[]) {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(20);
  doc.setTextColor(33, 37, 41);
  doc.text('Scrapped Assets Report', 14, 22);
  
  // Subtitle with date
  doc.setFontSize(10);
  doc.setTextColor(108, 117, 125);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
  
  // Summary
  const totalValue = assets.reduce((sum, a) => sum + Number(a.purchase_price), 0);
  doc.setFontSize(12);
  doc.setTextColor(33, 37, 41);
  doc.text(`Total Scrapped Assets: ${assets.length}`, 14, 42);
  doc.text(`Total Original Value: $${totalValue.toLocaleString()}`, 14, 50);
  
  // Table
  const tableData = assets.map(asset => [
    asset.asset_code,
    asset.name,
    asset.category?.name || 'N/A',
    asset.serial_number,
    `${asset.make} ${asset.model}`,
    new Date(asset.purchase_date).toLocaleDateString(),
    `$${Number(asset.purchase_price).toLocaleString()}`,
    asset.branch,
    new Date(asset.updated_at).toLocaleDateString(),
  ]);

  autoTable(doc, {
    startY: 58,
    head: [['Code', 'Name', 'Category', 'Serial', 'Make/Model', 'Purchase Date', 'Value', 'Branch', 'Scrapped Date']],
    body: tableData,
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(108, 117, 125);
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  doc.save('scrapped-assets-report.pdf');
}

export function generateUtilizationReport(data: AssetUtilizationData[]) {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(20);
  doc.setTextColor(33, 37, 41);
  doc.text('Asset Utilization Report', 14, 22);
  
  // Subtitle with date
  doc.setFontSize(10);
  doc.setTextColor(108, 117, 125);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
  
  // Summary statistics
  const avgUtilization = data.length > 0 
    ? Math.round(data.reduce((sum, a) => sum + a.utilizationRate, 0) / data.length) 
    : 0;
  const totalValue = data.reduce((sum, a) => sum + a.purchasePrice, 0);
  const highUtilization = data.filter(a => a.utilizationRate >= 70).length;
  const lowUtilization = data.filter(a => a.utilizationRate < 30).length;
  
  doc.setFontSize(12);
  doc.setTextColor(33, 37, 41);
  doc.text(`Total Assets: ${data.length}`, 14, 42);
  doc.text(`Total Value: $${totalValue.toLocaleString()}`, 14, 50);
  doc.text(`Average Utilization: ${avgUtilization}%`, 14, 58);
  doc.text(`High Utilization (≥70%): ${highUtilization} assets`, 14, 66);
  doc.text(`Low Utilization (<30%): ${lowUtilization} assets`, 14, 74);
  
  // Table
  const tableData = data.map(asset => [
    asset.assetCode,
    asset.name,
    asset.category,
    asset.status,
    `$${asset.purchasePrice.toLocaleString()}`,
    asset.totalDays.toString(),
    asset.assignedDays.toString(),
    `${asset.utilizationRate}%`,
  ]);

  autoTable(doc, {
    startY: 82,
    head: [['Code', 'Name', 'Category', 'Status', 'Value', 'Total Days', 'Assigned Days', 'Utilization']],
    body: tableData,
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      7: {
        halign: 'right',
      },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 7) {
        const rate = parseInt(data.cell.text[0] || '0');
        if (rate >= 70) {
          data.cell.styles.textColor = [22, 163, 74]; // green
        } else if (rate < 30) {
          data.cell.styles.textColor = [220, 38, 38]; // red
        }
      }
    },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(108, 117, 125);
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  doc.save('asset-utilization-report.pdf');
}

export function generateStockReport(
  stockData: Array<{
    branch: string;
    category: string;
    available: number;
    assigned: number;
    repair: number;
    value: number;
  }>
) {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(20);
  doc.setTextColor(33, 37, 41);
  doc.text('Stock Summary Report', 14, 22);
  
  // Subtitle with date
  doc.setFontSize(10);
  doc.setTextColor(108, 117, 125);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
  
  // Summary
  const totals = stockData.reduce(
    (acc, item) => ({
      available: acc.available + item.available,
      assigned: acc.assigned + item.assigned,
      repair: acc.repair + item.repair,
      value: acc.value + item.value,
    }),
    { available: 0, assigned: 0, repair: 0, value: 0 }
  );
  
  doc.setFontSize(12);
  doc.setTextColor(33, 37, 41);
  doc.text(`Total Available: ${totals.available}`, 14, 42);
  doc.text(`Total Assigned: ${totals.assigned}`, 14, 50);
  doc.text(`Total in Repair: ${totals.repair}`, 14, 58);
  doc.text(`Total Value: $${totals.value.toLocaleString()}`, 14, 66);
  
  // Table
  const tableData = stockData.map(item => [
    item.branch,
    item.category,
    item.available.toString(),
    item.assigned.toString(),
    item.repair.toString(),
    `$${item.value.toLocaleString()}`,
  ]);

  autoTable(doc, {
    startY: 74,
    head: [['Branch', 'Category', 'Available', 'Assigned', 'In Repair', 'Value']],
    body: tableData,
    foot: [[
      'TOTAL',
      '',
      totals.available.toString(),
      totals.assigned.toString(),
      totals.repair.toString(),
      `$${totals.value.toLocaleString()}`,
    ]],
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: 255,
      fontStyle: 'bold',
    },
    footStyles: {
      fillColor: [37, 99, 235],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  doc.save('stock-summary-report.pdf');
}
