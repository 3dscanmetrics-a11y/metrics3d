// @ts-ignore
import PDFDocument from 'pdfkit/js/pdfkit.standalone.js';
import { PDF_LOGO as base64Logo } from './pdf-logo';
import { calculateEstimateRange, DEFAULT_PRICING } from './pricing';

const formatZAR = (val: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(val || 0);

export function generateQuotePDF(lead: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4', autoFirstPage: true });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: any) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const issueDate = new Date().toLocaleDateString('en-GB');

      // Helper function to draw top header bar on T&C pages
      const drawHeaderBar = () => {
        // Logo Graphic
        if (base64Logo) {
          doc.image(base64Logo, 40, 30, { fit: [32, 32], align: 'center', valign: 'center' });
        } else {
          doc.circle(55, 45, 14).fill('#ea580c');
          doc.rect(49, 36, 12, 16).fill('#0f172a');
          doc.circle(55, 42, 3).fill('#ffffff');
        }

        doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text('3D Scan Metrics Laser Scanning', 78, 33);
        doc.fillColor('#475569').fontSize(8).font('Helvetica-Oblique').text('A Freelance Geomatics ZA Company', 78, 46);
        doc.fontSize(7.5).font('Helvetica').fillColor('#64748b')
           .text('Reg: 2018/643721/07  |  isaiah@3dscanmetrics.co.za  |  www.3dscanmetrics.co.za  |  +27 82 733 6873', 78, 56);
        
        doc.moveTo(40, 68).lineTo(555, 68).strokeColor('#cbd5e1').lineWidth(0.5).stroke();
      };

      // ==========================================
      // PAGE 1: FORMAL SCOPING QUOTATION
      // ==========================================

      // Official Logo
      if (base64Logo) {
        doc.image(base64Logo, 40, 32, { fit: [50, 50], align: 'center', valign: 'center' });
      } else {
        doc.circle(65, 55, 22).fill('#ea580c');
        doc.rect(57, 42, 16, 24).fill('#0f172a');
        doc.circle(65, 50, 4).fill('#ffffff');
      }

      // Company Info (Left Header)
      doc.fillColor('#0f172a').fontSize(13).font('Helvetica-Bold').text('3D Scan Metrics Laser Scanning', 98, 38);
      doc.fillColor('#475569').fontSize(8.5).font('Helvetica-Oblique').text('A Freelance Geomatics ZA Company', 98, 53);
      doc.fontSize(8).font('Helvetica').fillColor('#64748b');
      doc.text('Reg: 2018/643721/07', 98, 65);
      doc.text('isaiah@3dscanmetrics.co.za', 98, 75);
      doc.text('www.3dscanmetrics.co.za', 98, 85);
      doc.text('Contact Person: Isaiah Mpofu', 98, 95);
      doc.text('Cell: +27 82 733 6873', 98, 105);

      const today = new Date();
      const expiryDateObj = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      const expiryDateStr = expiryDateObj.toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' });

      // Quote Metadata (Right Header)
      doc.fillColor('#0f172a').fontSize(8.5).font('Helvetica-Bold').text(`Issue Date: ${issueDate}`, 360, 36, { align: 'right' });
      doc.fillColor('#ea580c').fontSize(8.5).font('Helvetica-Bold').text(`Valid Until: ${expiryDateStr}`, 360, 48, { align: 'right' });

      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a').text('Quote to: ', 330, 68, { continued: true });
      doc.font('Helvetica').text(lead.company || lead.name || 'Valued Client');
      
      doc.font('Helvetica-Bold').text('Contact Person: ', 330, 80, { continued: true });
      doc.font('Helvetica').text(lead.name || '');

      doc.font('Helvetica-Bold').text('Email: ', 330, 92, { continued: true });
      doc.font('Helvetica').text(lead.email || '');

      if (lead.phone) {
        doc.font('Helvetica-Bold').text('Cell: ', 330, 104, { continued: true });
        doc.font('Helvetica').text(lead.phone);
      }

      // Separator Line
      doc.moveTo(40, 125).lineTo(555, 125).strokeColor('#e2e8f0').lineWidth(1).stroke();

      // Project Specifications Header
      let y = 135;
      doc.fontSize(9.5).font('Helvetica-BoldOblique').fillColor('#0f172a');
      doc.text('Project: ', 40, y, { continued: true }).font('Helvetica-Oblique').text(lead.project || '3D Laser Scanning & As-Built Verification');
      
      let delivList: string[] = [];
      if (Array.isArray(lead.deliverables)) {
        delivList = lead.deliverables;
      } else if (typeof lead.deliverables === 'string') {
        try {
          const parsed = JSON.parse(lead.deliverables);
          if (Array.isArray(parsed)) {
            delivList = parsed;
          } else if (typeof parsed === 'object' && parsed !== null && Array.isArray((parsed as any).deliverables)) {
            delivList = (parsed as any).deliverables;
          }
        } catch(e) {}
      }

      const payloadObj = typeof lead.payload === 'string' ? JSON.parse(lead.payload || '{}') : (lead.payload || {});
      if (delivList.length === 0 && Array.isArray(payloadObj.deliverables)) {
        delivList = payloadObj.deliverables;
      }
      if (!Array.isArray(delivList)) {
        delivList = [];
      }

      const formattedDelivs = delivList.map((d: string) => {
        if (d === 'raw') return 'Raw Point Cloud (.E57)';
        if (d === 'viewer') return 'Web Viewer (TruView)';
        if (d === 'cad') return '2D CAD Floor Plans (.DWG)';
        if (d === 'topo') return 'Topographical Survey / Mesh';
        if (d === 'bim') return `3D Revit Model (LOD ${lead.bimLevel || payloadObj.bimLevel || '300'})`;
        return d;
      }).join(', ');

      y += 14;
      doc.font('Helvetica-BoldOblique').text('Deliverables: ', 40, y, { continued: true }).font('Helvetica-Oblique').text(formattedDelivs || '3D Laser Scanning Data');

      const totalTimeframe = Math.max(1, (lead.fieldDays || 1) + (lead.processDays || 1));
      y += 14;
      doc.font('Helvetica-BoldOblique').text('Timeframe: ', 40, y, { continued: true }).font('Helvetica-Oblique').text(`${totalTimeframe} Days (${lead.fieldDays || 1} Days On-site, ${lead.processDays || 1} Days Processing)`);

      // ==========================================
      // ITEMIZED SCOPE / BILL OF QUANTITIES TABLE
      // ==========================================
      y += 22;

      const customItems = Array.isArray(lead.customItems)
        ? lead.customItems
        : Array.isArray(payloadObj.customItems)
          ? payloadObj.customItems
          : [];

      const isCustomBoq = payloadObj.mode === 'custom' && customItems.length > 0;

      let quoteTotal = Number(lead.quoteTotal) || 0;

      if (isCustomBoq) {
        quoteTotal = customItems.reduce((sum: number, it: any) => sum + (Number(it.total || it.totalZar || (it.quantity * it.unitPrice)) || 0), 0);

        // Custom BoQ Table Header
        doc.rect(40, y, 515, 20).fill('#0f172a');
        doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold');
        doc.text('Bill of Quantities / Scope Description', 48, y + 5, { width: 290 });
        doc.text('Qty', 345, y + 5, { width: 35, align: 'center' });
        doc.text('Unit Price (ZAR)', 385, y + 5, { width: 75, align: 'right' });
        doc.text('Amount (ZAR)', 465, y + 5, { width: 80, align: 'right' });

        y += 20;

        customItems.forEach((item: any, idx: number) => {
          const isBg = idx % 2 === 1;
          if (isBg) doc.rect(40, y, 515, 16).fill('#f8fafc');

          const qty = Number(item.quantity || 1);
          const unitPrice = Number(item.unitPrice || item.unitPriceZar || 0);
          const itemTotal = Number(item.total || item.totalZar || (qty * unitPrice));

          doc.fillColor('#334155').fontSize(8).font('Helvetica');
          doc.text(String(item.description || 'Custom Scope Item'), 48, y + 3, { width: 290 });
          doc.text(String(qty), 345, y + 3, { width: 35, align: 'center' });
          doc.text(formatZAR(unitPrice), 385, y + 3, { width: 75, align: 'right' });
          doc.fillColor('#0f172a').font('Helvetica-Bold').text(formatZAR(itemTotal), 465, y + 3, { width: 80, align: 'right' });

          y += 16;
        });

      } else {
        // Calculate exact itemized breakdown lines from pricing calculator engine
        const estRange = calculateEstimateRange(DEFAULT_PRICING, {
          area: lead.area,
          complexity: lead.complexity,
          deliverables: delivList,
          access: lead.access,
          accuracy: lead.accuracy,
          bimLevel: lead.bimLevel,
          systems: lead.systems || payloadObj.systems,
          distanceKm: lead.distanceKm,
          finalPrice: lead.quoteTotal,
        });

        const rawLines = estRange.breakdown.lines;
        quoteTotal = Number(lead.quoteTotal) || estRange.mid;
        const sumRaw = rawLines.reduce((acc, l) => acc + (l.amount || 0), 0);

        // Proportionally scale line items so table sum matches firm quoteTotal down to the cent
        let lines = rawLines.map((l) => ({ ...l }));
        if (sumRaw > 0 && Math.abs(quoteTotal - sumRaw) > 0.01) {
          const scale = quoteTotal / sumRaw;
          let runningSum = 0;
          const nonZeroCount = lines.filter((l) => l.amount > 0).length;
          let processedCount = 0;

          lines = lines.map((line) => {
            if (line.amount === 0) return line;
            processedCount++;
            let scaledAmount = Math.round(line.amount * scale * 100) / 100;
            runningSum += scaledAmount;

            // Adjust last non-zero line for exact rounding balance
            if (processedCount === nonZeroCount) {
              const diff = Math.round((quoteTotal - runningSum) * 100) / 100;
              scaledAmount = Math.round((scaledAmount + diff) * 100) / 100;
            }
            return { ...line, amount: scaledAmount };
          });
        }

        // Table Header Row
        doc.rect(40, y, 515, 20).fill('#0f172a');
        doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold');
        doc.text('Itemised Technical Scope Description', 48, y + 5, { width: 330 });
        doc.text('Category / Status', 380, y + 5, { width: 80, align: 'center' });
        doc.text('Cost (ZAR)', 465, y + 5, { width: 80, align: 'right' });

        y += 20;

        // Render Itemized Rows from Calculator Breakdown
        lines.forEach((line, idx) => {
          const isBg = idx % 2 === 1;
          if (isBg) doc.rect(40, y, 515, 15).fill('#f8fafc');

          doc.fillColor('#334155').fontSize(8).font('Helvetica');
          doc.text(line.label, 48, y + 3, { width: 330 });

          let statusText = 'Itemized';
          if (line.amount === 0) {
            statusText = line.label.toLowerCase().includes('free') ? 'Free (≤30km)' : 'Included';
          } else if (line.label.toLowerCase().includes('site')) {
            statusText = 'Fieldwork';
          } else if (line.label.toLowerCase().includes('deliverable')) {
            statusText = 'Deliverable';
          }

          doc.fillColor('#64748b').fontSize(7.5).text(statusText, 380, y + 3.5, { width: 80, align: 'center' });

          const costStr = line.amount === 0 ? 'R0.00' : formatZAR(line.amount);
          doc.fillColor('#0f172a').fontSize(8).font(line.amount > 0 ? 'Helvetica-Bold' : 'Helvetica').text(costStr, 465, y + 3, { width: 80, align: 'right' });

          y += 15;
        });
      }

      // GRAND TOTAL ROW
      doc.rect(40, y, 515, 22).fill('#ea580c');
      doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold');
      doc.text(`${lead.project || '3D Laser Scanning Project'} - Total Quote`, 48, y + 6);
      doc.text(`Grand Total: ${formatZAR(quoteTotal)}`, 365, y + 6, { width: 180, align: 'right' });
      y += 32;

      // ==========================================
      // BANKING & PAYMENT DETAILS BOX
      // ==========================================
      doc.rect(40, y, 515, 80).strokeColor('#cbd5e1').lineWidth(0.8).stroke();
      doc.rect(40, y, 515, 18).fill('#f8fafc');
      
      doc.fillColor('#0f172a').fontSize(8.5).font('Helvetica-Bold').text('Payment Reference & Banking Details', 50, y + 5);
      
      y += 24;
      doc.fillColor('#334155').fontSize(8).font('Helvetica');
      doc.font('Helvetica-Bold').text('Payment reference: ', 50, y, { continued: true }).font('Helvetica').text(lead.company || lead.name || 'Client Name');
      y += 12;
      doc.font('Helvetica-Bold').text('Bank: ', 50, y, { continued: true }).font('Helvetica').text('First National Bank (FNB)');
      y += 12;
      doc.font('Helvetica-Bold').text('Account name: ', 50, y, { continued: true }).font('Helvetica').text('Freelance Geomatics ZA (Pty) Ltd');
      y += 12;
      doc.font('Helvetica-Bold').text('Account number: ', 50, y, { continued: true }).font('Helvetica').text('62909760185');
      y += 12;
      doc.font('Helvetica-Bold').text('Branch code: ', 50, y, { continued: true }).font('Helvetica').text('250655');

      // ==========================================
      // PAGE 2: TERMS AND CONDITIONS (Part 1)
      // ==========================================
      doc.addPage();
      drawHeaderBar();

      let ty = 80;
      doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text('TERMS AND CONDITIONS OF SERVICE: 3D LASER SCANNING', 40, ty);
      ty += 14;
      doc.fillColor('#475569').fontSize(8.5).font('Helvetica-Oblique').text('Freelance Geomatics ZA (Pty) Ltd t/a 3D Scan Metrics Laser Scanning | Reg: 2018/643721/07', 40, ty);
      ty += 20;

      const writeSectionHeader = (title: string) => {
        doc.fillColor('#0f172a').fontSize(9.5).font('Helvetica-Bold').text(title, 40, ty);
        ty += 13;
      };

      const writeClause = (num: string, text: string) => {
        doc.fillColor('#334155').fontSize(8).font('Helvetica-Bold').text(num, 40, ty, { width: 22 });
        doc.font('Helvetica').text(text, 64, ty, { width: 490, align: 'justify', lineGap: 2 });
        ty += doc.heightOfString(text, { width: 490 }) + 6;
      };

      // 1. DEFINITIONS
      writeSectionHeader('1. DEFINITIONS');
      writeClause('1.1.', '"The Company" refers to Freelance Geomatics ZA (Pty) Ltd.');
      writeClause('1.2.', '"The Client" refers to the entity requesting the 3D laser scanning services.');
      writeClause('1.3.', '"Services" refers strictly to 3D Laser Scanning, Point Cloud Registration, 2D Drafting, and 3D Revit BIM Modelling.');

      ty += 4;
      // 2. QUOTATION VALIDITY
      writeSectionHeader('2. QUOTATION VALIDITY');
      writeClause('2.1.', 'Quotations are valid for acceptance for a period of 90 days from the date of issue.');
      writeClause('2.2.', 'Pricing is based on the specific Quantity (Time/Sqm) and physical scope detailed in this quotation. Any expansion of the scan area or level of detail (LOD) requested on-site will require a formal variation order.');

      ty += 4;
      // 3. PAYMENT TERMS
      writeSectionHeader('3. PAYMENT TERMS');
      writeClause('3.1.', 'Deposit: A 50% deposit is required upon quotation acceptance to secure equipment allocation and mobilize the scanning team.');
      writeClause('3.2.', 'Final Payment: The remaining 50% balance is strictly due prior to the release of final CAD/BIM deliverables.');
      writeClause('3.3.', 'Banking Details: First National Bank (FNB) | Account No: 62909760185 | Branch Code: 250655.');

      ty += 4;
      // 4. SITE ACCESS AND SCANNING CONDITIONS
      writeSectionHeader('4. SITE ACCESS AND SCANNING CONDITIONS');
      writeClause('4.1.', 'Line of Sight: The Client acknowledges that 3D laser scanners operate using optical line-of-sight technology. The scanner can only capture surface data visible to the sensor lens.');
      writeClause('4.2.', 'Site Preparation: The Client must ensure the target scanning site is unobstructed (e.g. clear of parked vehicles, temporary debris, or excessive vegetation) prior to team arrival.');
      writeClause('4.3.', 'Occlusions (Data Shadows): The Company is not liable for data voids caused by immovable objects (e.g. heavy plant machinery, stacked pallets). If additional scans are required behind moved objects, additional field setups will be charged.');
      writeClause('4.4.', 'Site Stability: Laser scanning requires stable ground conditions. Excessive environmental vibration (e.g. nearby heavy machinery or structural movement) may introduce scan noise or require re-scans charged as additional field time.');

      // ==========================================
      // PAGE 3: TERMS AND CONDITIONS (Part 2) & ACCEPTANCE
      // ==========================================
      doc.addPage();
      drawHeaderBar();

      ty = 80;

      // 5. DELIVERABLES AND DATA
      writeSectionHeader('5. DELIVERABLES AND DATA');
      writeClause('5.1.', 'File Formats: Final deliverables will be provided in the formats specified in the quotation (e.g. .RCP, .E57, .RVT, .DWG, .SAT).');
      writeClause('5.2.', 'File Size: 3D Point Cloud datasets are extremely large (Gigabytes to Terabytes). The Client is responsible for ensuring adequate hardware, graphics storage, and software capabilities to process these files.');
      writeClause('5.3.', 'Accuracy: While survey-grade high-precision scanners are utilized, final BIM models represent existing physical site conditions at the time of scanning. The Company is not liable for subsequent site alterations.');
      writeClause('5.4.', 'Data Archiving: The Company will retain a backup of raw scan data for 6 months from project completion. Thereafter, archiving is the sole responsibility of the Client.');

      ty += 6;
      // 6. EXCLUSIONS
      writeSectionHeader('6. EXCLUSIONS');
      writeClause('6.1.', 'Unless explicitly itemized in the quote, Services do not include: Sub-surface GPR utility detection, structural rebar scanning, or soil investigation.');
      writeClause('6.2.', 'Destructive testing or invasive inspection (e.g. opening ceilings, drilling inspection holes).');
      writeClause('6.3.', 'Confined space scanning unless specialized safety permits, breathing apparatus, and certified harnesses are quoted.');

      ty += 6;
      // 7. INTELLECTUAL PROPERTY
      writeSectionHeader('7. INTELLECTUAL PROPERTY & DATA LICENSE');
      writeClause('7.1.', 'All raw Point Clouds and 3D Models remain the property of the Company until full payment is received. Upon receipt of final payment, the Client is granted an irrevocable perpetual license to use the data for the specified project.');

      ty += 20;

      // ACCEPTANCE & SIGNATURE BLOCK
      doc.rect(40, ty, 515, 110).strokeColor('#ea580c').lineWidth(1).stroke();
      doc.rect(40, ty, 515, 20).fill('#fff7ed');

      doc.fillColor('#ea580c').fontSize(9.5).font('Helvetica-Bold').text('ACCEPTANCE OF QUOTATION & TERMS', 50, ty + 5);
      
      ty += 26;
      doc.fillColor('#334155').fontSize(8.5).font('Helvetica').text('I, the undersigned, hereby accept this quotation and agree to the 3D Laser Scanning terms of service above.', 50, ty);

      ty += 24;
      doc.fontSize(8.5).font('Helvetica-Bold');
      doc.text('Signed: __________________________________________', 50, ty);
      doc.text('Date: ________________________', 340, ty);

      ty += 22;
      doc.text(`For (${lead.company || lead.name || 'Client Name'}): ____________________________________________________`, 50, ty);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export function generateTaxInvoicePDF(invoice: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: any) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Official Logo
      if (base64Logo) {
        doc.image(base64Logo, 40, 32, { fit: [50, 50], align: 'center', valign: 'center' });
      } else {
        doc.circle(65, 55, 22).fill('#ea580c');
      }

      // Company Info (Left Header)
      doc.fillColor('#0f172a').fontSize(13).font('Helvetica-Bold').text('3D Scan Metrics Laser Scanning', 98, 38);
      doc.fillColor('#475569').fontSize(8.5).font('Helvetica-Oblique').text('A Freelance Geomatics ZA Company', 98, 53);
      doc.fontSize(8).font('Helvetica').fillColor('#64748b');
      doc.text('Reg: 2018/643721/07', 98, 65);
      doc.text('isaiah@3dscanmetrics.co.za  |  www.3dscanmetrics.co.za', 98, 75);
      doc.text('Contact: Isaiah Mpofu  |  Cell: +27 82 733 6873', 98, 85);

      const invDate = new Date(invoice.createdAt || Date.now()).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' });
      
      // Dynamic Payment Terms & Due Date calculation
      const termsRaw = String(invoice.paymentTerms || invoice.payment_terms || '30 Days').trim();
      let dueDays = 30;
      if (termsRaw.toLowerCase().includes('receipt') || termsRaw.toLowerCase().includes('due on')) {
        dueDays = 0;
      } else if (termsRaw.includes('7')) {
        dueDays = 7;
      } else if (termsRaw.includes('14')) {
        dueDays = 14;
      } else if (termsRaw.includes('60')) {
        dueDays = 60;
      } else if (termsRaw.includes('30')) {
        dueDays = 30;
      }

      let formattedDueDate = '';
      if (invoice.dueDate) {
        formattedDueDate = new Date(invoice.dueDate).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' });
      } else {
        const createdMs = new Date(invoice.createdAt || Date.now()).getTime();
        const dueMs = createdMs + dueDays * 24 * 60 * 60 * 1000;
        formattedDueDate = new Date(dueMs).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' });
      }

      const invNo = `INV-${String(invoice.id || '001').slice(0, 8).toUpperCase()}`;

      // Invoice Title & Status Stamp (Right Header)
      doc.fillColor('#ea580c').fontSize(16).font('Helvetica-Bold').text('INVOICE', 360, 36, { align: 'right' });
      doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold').text(`Invoice #: ${invNo}`, 360, 56, { align: 'right' });
      doc.fillColor('#64748b').fontSize(8.5).font('Helvetica').text(`Issue Date: ${invDate}`, 360, 68, { align: 'right' });
      doc.fillColor('#64748b').fontSize(8.5).font('Helvetica').text(`Due Date: ${formattedDueDate}`, 360, 80, { align: 'right' });

      // Separator Line
      doc.moveTo(40, 105).lineTo(555, 105).strokeColor('#cbd5e1').lineWidth(0.5).stroke();

      // Billed To Section (Standard South African Commercial Invoice Customer Block)
      let y = 115;
      doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#0f172a').text('BILLED TO (CUSTOMER DETAILS)', 40, y);

      const clientCompany = invoice.clientCompany || (invoice.company && invoice.company !== invoice.clientName ? invoice.company : '');
      const contactPerson = invoice.contactName || invoice.name || (invoice.clientName && invoice.clientName !== clientCompany ? invoice.clientName : 'Valued Client');

      y += 14;
      if (clientCompany && clientCompany !== contactPerson) {
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a').text('Company Name: ', 40, y, { continued: true });
        doc.font('Helvetica').text(clientCompany);
        
        y += 12;
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a').text('Attention: ', 40, y, { continued: true });
        doc.font('Helvetica').text(contactPerson);
      } else {
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a').text('Client Name: ', 40, y, { continued: true });
        doc.font('Helvetica').text(contactPerson || 'Valued Client');
      }

      // Customer Physical / Billing Address (Standard SA Requirement)
      y += 12;
      const displayAddress = invoice.clientAddress || invoice.address || '';
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a').text('Address: ', 40, y, { continued: true });
      doc.font('Helvetica').text(displayAddress);

      // Customer Contact Details
      const contactDetails: string[] = [];
      if (invoice.clientEmail || invoice.email) contactDetails.push(`Email: ${invoice.clientEmail || invoice.email}`);
      if (invoice.clientPhone || invoice.phone) contactDetails.push(`Cell: ${invoice.clientPhone || invoice.phone}`);
      if (contactDetails.length > 0) {
        y += 12;
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a').text('Contact: ', 40, y, { continued: true });
        doc.font('Helvetica').text(contactDetails.join('  |  '));
      }

      // Customer VAT Number & Tax Registration (Standard SA Requirement)
      y += 12;
      const vatVal = invoice.clientVat || invoice.vatNumber || invoice.taxNumber || '';
      const regVal = invoice.clientReg || invoice.registrationNumber || '';
      let vatDisplay = '';
      if (vatVal && regVal) {
        vatDisplay = `Reg No: ${regVal}  |  VAT No: ${vatVal}`;
      } else if (vatVal) {
        vatDisplay = vatVal;
      } else if (regVal) {
        vatDisplay = `Reg No: ${regVal}`;
      }
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a').text('VAT No: ', 40, y, { continued: true });
      doc.font('Helvetica').text(vatDisplay);

      y += 12;
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a').text('Project: ', 40, y, { continued: true });
      doc.font('Helvetica-Oblique').text(invoice.project || '3D Laser Scanning Services');

      // Table Header Row
      y += 24;
      doc.rect(40, y, 515, 20).fill('#0f172a');
      doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold');
      doc.text('Item Description & Service Scope', 48, y + 5, { width: 290 });
      doc.text('Qty', 345, y + 5, { width: 35, align: 'center' });
      doc.text('Unit Price (ZAR)', 385, y + 5, { width: 75, align: 'right' });
      doc.text('Amount (ZAR)', 465, y + 5, { width: 80, align: 'right' });

      y += 20;
      const items = Array.isArray(invoice.items) && invoice.items.length > 0 ? invoice.items : [
        { description: `3D Laser Scanning & As-Built Verification: ${invoice.project || 'Project'}`, quantity: 1, unitPriceZar: invoice.amount || 0, totalZar: invoice.amount || 0 }
      ];

      let subtotal = 0;
      items.forEach((item: any, idx: number) => {
        const lineTotal = Number(item.totalZar || item.total_zar || 0);
        subtotal += lineTotal;

        const textHeight = Math.max(18, doc.heightOfString(item.description || 'Service Line Item', { width: 290 }) + 6);
        const isBg = idx % 2 === 1;
        if (isBg) doc.rect(40, y, 515, textHeight).fill('#f8fafc');

        doc.fillColor('#334155').fontSize(8).font('Helvetica');
        doc.text(item.description || 'Service Line Item', 48, y + 3, { width: 290 });
        doc.text(String(item.quantity || 1), 345, y + 3, { width: 35, align: 'center' });
        doc.text(formatZAR(item.unitPriceZar || item.unit_price_zar || lineTotal), 385, y + 3, { width: 75, align: 'right' });
        doc.fillColor('#0f172a').font('Helvetica-Bold').text(formatZAR(lineTotal), 465, y + 3, { width: 80, align: 'right' });

        y += textHeight;
      });

      // FINANCIAL SUMMARY & TOTALS (NON-VAT VENDOR COMPLIANT)
      y += 10;
      doc.moveTo(340, y).lineTo(555, y).strokeColor('#cbd5e1').lineWidth(0.5).stroke();
      
      y += 8;
      const totalDue = Math.round(subtotal * 100) / 100;
      const isPaid = String(invoice.status).toUpperCase() === 'PAID';
      const isPartial = String(invoice.status).toUpperCase() === 'PARTIAL' || String(invoice.status).toUpperCase() === 'PARTIALLY PAID';
      const amountPaid = isPaid ? totalDue : Number(invoice.amountPaid || invoice.amount_paid || 0);
      const netBalance = Math.max(0, Math.round((totalDue - amountPaid) * 100) / 100);

      doc.fillColor('#475569').fontSize(8.5).font('Helvetica').text('Subtotal:', 340, y);
      doc.fillColor('#0f172a').font('Helvetica-Bold').text(formatZAR(totalDue), 465, y, { width: 80, align: 'right' });

      y += 14;
      doc.fillColor('#475569').fontSize(8.5).font('Helvetica').text('VAT (Non-VAT Vendor):', 340, y);
      doc.fillColor('#0f172a').font('Helvetica-Bold').text('R 0,00', 465, y, { width: 80, align: 'right' });

      if (amountPaid > 0 && !isPaid) {
        y += 14;
        doc.fillColor('#047857').fontSize(8.5).font('Helvetica').text('Less Deposit / Paid:', 340, y);
        doc.fillColor('#047857').font('Helvetica-Bold').text(`-${formatZAR(amountPaid)}`, 465, y, { width: 80, align: 'right' });
      }

      y += 18;
      doc.rect(340, y, 215, 24).fill(isPaid ? '#10b981' : (amountPaid > 0 ? '#d97706' : '#ea580c'));
      doc.fillColor('#ffffff').fontSize(9.5).font('Helvetica-Bold').text(amountPaid > 0 && !isPaid ? 'Balance Due:' : 'Total Amount Due:', 345, y + 7);
      doc.text(formatZAR(isPaid ? totalDue : netBalance), 445, y + 7, { width: 105, align: 'right' });

      // STATUS STAMP
      y += 35;
      doc.rect(40, y, 515, 75).strokeColor('#cbd5e1').lineWidth(0.8).stroke();
      doc.rect(40, y, 515, 18).fill('#f8fafc');

      doc.fillColor('#0f172a').fontSize(8.5).font('Helvetica-Bold').text('Payment Terms & Banking Details', 50, y + 5);

      y += 24;
      doc.fillColor('#334155').fontSize(8).font('Helvetica');
      doc.font('Helvetica-Bold').text('Bank: ', 50, y, { continued: true }).font('Helvetica').text('First National Bank (FNB)');
      doc.font('Helvetica-Bold').text('Account Name: ', 280, y, { continued: true }).font('Helvetica').text('Freelance Geomatics ZA (Pty) Ltd');
      y += 12;
      doc.font('Helvetica-Bold').text('Account Number: ', 50, y, { continued: true }).font('Helvetica').text('62909760185');
      doc.font('Helvetica-Bold').text('Branch Code: ', 280, y, { continued: true }).font('Helvetica').text('250655');
      y += 12;
      doc.font('Helvetica-Bold').text('Payment Reference: ', 50, y, { continued: true }).font('Helvetica').text(`${invNo} (${invoice.clientName || 'Client'})`);

      // Payment Status Banner at bottom
      y += 28;
      if (isPaid) {
        doc.rect(40, y, 515, 22).fill('#10b981');
        doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold').text('PAYMENT RECEIVED IN FULL - THANK YOU FOR YOUR BUSINESS', 40, y + 6, { align: 'center', width: 515 });
      } else if (amountPaid > 0) {
        doc.rect(40, y, 515, 22).fill('#d97706');
        doc.fillColor('#ffffff').fontSize(9.5).font('Helvetica-Bold').text(`PARTIAL PAYMENT RECEIVED (${formatZAR(amountPaid)}) - OUTSTANDING BALANCE: ${formatZAR(netBalance)}`, 40, y + 6, { align: 'center', width: 515 });
      } else {
        doc.rect(40, y, 515, 22).fill('#0f172a');
        let bannerText = `PAYMENT DUE WITHIN ${dueDays} DAYS OF INVOICE DATE`;
        if (dueDays === 0 || termsRaw.toLowerCase().includes('receipt') || termsRaw.toLowerCase().includes('due on')) {
          bannerText = 'PAYMENT DUE UPON RECEIPT OF INVOICE';
        } else if (termsRaw && !termsRaw.toLowerCase().includes('days') && !termsRaw.includes('30')) {
          bannerText = `PAYMENT TERMS: ${termsRaw.toUpperCase()}`;
        }
        doc.fillColor('#ffffff').fontSize(9.5).font('Helvetica-Bold').text(bannerText, 40, y + 6, { align: 'center', width: 515 });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export function generateClientStatementPDF(client: any, invoices: any[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: any) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Official Logo
      if (base64Logo) {
        doc.image(base64Logo, 40, 32, { fit: [50, 50], align: 'center', valign: 'center' });
      } else {
        doc.circle(65, 55, 22).fill('#ea580c');
      }

      // Company Info (Left Header)
      doc.fillColor('#0f172a').fontSize(13).font('Helvetica-Bold').text('3D Scan Metrics Laser Scanning', 98, 38);
      doc.fillColor('#475569').fontSize(8.5).font('Helvetica-Oblique').text('A Freelance Geomatics ZA Company', 98, 53);
      doc.fontSize(8).font('Helvetica').fillColor('#64748b');
      doc.text('Reg: 2018/643721/07', 98, 65);
      doc.text('isaiah@3dscanmetrics.co.za  |  www.3dscanmetrics.co.za', 98, 75);
      doc.text('Contact: Isaiah Mpofu  |  Cell: +27 82 733 6873', 98, 85);

      const statementDate = new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' });
      const accountNo = client.accountNumber || `CLI-${String(client.id || '001').slice(0, 6).toUpperCase()}`;

      // Statement Title & Metadata (Right Header)
      doc.fillColor('#ea580c').fontSize(14).font('Helvetica-Bold').text('STATEMENT OF ACCOUNT', 320, 36, { align: 'right' });
      doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold').text(`Account #: ${accountNo}`, 320, 56, { align: 'right' });
      doc.fillColor('#64748b').fontSize(8.5).font('Helvetica').text(`Statement Date: ${statementDate}`, 320, 68, { align: 'right' });

      // Separator Line
      doc.moveTo(40, 105).lineTo(555, 105).strokeColor('#cbd5e1').lineWidth(0.5).stroke();

      // Account Holder Info Block
      let y = 115;
      doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#0f172a').text('ACCOUNT HOLDER DETAILS', 40, y);

      const clientName = client.name || client.company || 'Valued Client';
      const company = client.company && client.company !== client.name ? client.company : '';

      y += 14;
      if (company) {
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a').text('Company Name: ', 40, y, { continued: true });
        doc.font('Helvetica').text(company);
        y += 12;
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a').text('Attention: ', 40, y, { continued: true });
        doc.font('Helvetica').text(clientName);
      } else {
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a').text('Client Name: ', 40, y, { continued: true });
        doc.font('Helvetica').text(clientName);
      }

      y += 12;
      const displayAddress = [client.billingStreet || client.billing_street, client.billingCity || client.billing_city, client.billingPostalCode || client.billing_postal_code].filter(Boolean).join(', ') || client.address || '';
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a').text('Billing Address: ', 40, y, { continued: true });
      doc.font('Helvetica').text(displayAddress || '');

      const contactDetails: string[] = [];
      if (client.email) contactDetails.push(`Email: ${client.email}`);
      if (client.phone || client.mobile) contactDetails.push(`Cell: ${client.mobile || client.phone}`);
      if (contactDetails.length > 0) {
        y += 12;
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a').text('Contact: ', 40, y, { continued: true });
        doc.font('Helvetica').text(contactDetails.join('  |  '));
      }

      y += 12;
      const vatVal = client.vatNumber || client.vat_number || client.taxNumber || client.tax_number || '';
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a').text('VAT No: ', 40, y, { continued: true });
      doc.font('Helvetica').text(vatVal || '');

      // Table Header Row
      y += 24;
      doc.rect(40, y, 515, 20).fill('#0f172a');
      doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold');
      doc.text('Date', 48, y + 5, { width: 65 });
      doc.text('Invoice Ref', 115, y + 5, { width: 75 });
      doc.text('Project / Description', 190, y + 5, { width: 150 });
      doc.text('Status', 345, y + 5, { width: 50, align: 'center' });
      doc.text('Billed (ZAR)', 400, y + 5, { width: 75, align: 'right' });
      doc.text('Balance (ZAR)', 480, y + 5, { width: 70, align: 'right' });

      y += 20;

      let totalInvoiced = 0;
      let totalPaid = 0;
      let totalOutstanding = 0;

      if (!invoices || invoices.length === 0) {
        doc.rect(40, y, 515, 24).fill('#f8fafc');
        doc.fillColor('#64748b').fontSize(8.5).font('Helvetica-Oblique');
        doc.text('No transaction records found for this account.', 48, y + 7);
        y += 24;
      } else {
        invoices.forEach((inv: any, idx: number) => {
          const invAmount = Number(inv.amount || 0);
          const isPaid = String(inv.status).toUpperCase() === 'PAID';

          totalInvoiced += invAmount;
          if (isPaid) {
            totalPaid += invAmount;
          } else {
            totalOutstanding += invAmount;
          }

          const invDateStr = new Date(inv.createdAt || Date.now()).toLocaleDateString('en-ZA', { year: '2-digit', month: '2-digit', day: '2-digit' });
          const invRef = `INV-${String(inv.id || '').slice(0, 8).toUpperCase()}`;

          const isBg = idx % 2 === 1;
          if (isBg) doc.rect(40, y, 515, 18).fill('#f8fafc');

          doc.fillColor('#334155').fontSize(8).font('Helvetica');
          doc.text(invDateStr, 48, y + 4, { width: 65 });
          doc.font('Helvetica-Bold').text(invRef, 115, y + 4, { width: 75 });
          doc.font('Helvetica').text(String(inv.project || '3D Laser Scanning'), 190, y + 4, { width: 150 });

          const statusColor = isPaid ? '#059669' : '#dc2626';
          doc.fillColor(statusColor).font('Helvetica-Bold').text(isPaid ? 'PAID' : 'UNPAID', 345, y + 4, { width: 50, align: 'center' });

          doc.fillColor('#0f172a').font('Helvetica').text(formatZAR(invAmount), 400, y + 4, { width: 75, align: 'right' });
          const balAmount = isPaid ? 0 : invAmount;
          doc.font(balAmount > 0 ? 'Helvetica-Bold' : 'Helvetica').fillColor(balAmount > 0 ? '#b91c1c' : '#0f172a').text(formatZAR(balAmount), 480, y + 4, { width: 70, align: 'right' });

          y += 18;
        });
      }

      // FINANCIAL SUMMARY CARDS / TOTALS
      y += 12;
      doc.moveTo(40, y).lineTo(555, y).strokeColor('#cbd5e1').lineWidth(0.5).stroke();
      y += 12;

      doc.rect(40, y, 160, 40).fill('#f8fafc').strokeColor('#e2e8f0').lineWidth(1).stroke();
      doc.fillColor('#64748b').fontSize(7.5).font('Helvetica-Bold').text('TOTAL INVOICED', 48, y + 8);
      doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold').text(formatZAR(totalInvoiced), 48, y + 20);

      doc.rect(215, y, 160, 40).fill('#ecfdf5').strokeColor('#a7f3d0').lineWidth(1).stroke();
      doc.fillColor('#047857').fontSize(7.5).font('Helvetica-Bold').text('TOTAL PAYMENTS RECEIVED', 223, y + 8);
      doc.fillColor('#065f46').fontSize(11).font('Helvetica-Bold').text(formatZAR(totalPaid), 223, y + 20);

      doc.rect(390, y, 165, 40).fill('#fff7ed').strokeColor('#fdba74').lineWidth(1).stroke();
      doc.fillColor('#c2410c').fontSize(7.5).font('Helvetica-Bold').text('NET BALANCE OUTSTANDING', 398, y + 8);
      doc.fillColor('#9a3412').fontSize(11).font('Helvetica-Bold').text(formatZAR(totalOutstanding), 398, y + 20);

      y += 54;
      // Banking Details Box
      doc.rect(40, y, 515, 70).strokeColor('#cbd5e1').lineWidth(0.8).stroke();
      doc.rect(40, y, 515, 18).fill('#0f172a');
      doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold').text('Payment Instructions & Banking Details', 50, y + 5);

      y += 24;
      doc.fillColor('#334155').fontSize(8).font('Helvetica');
      doc.font('Helvetica-Bold').text('Bank: ', 50, y, { continued: true }).font('Helvetica').text('First National Bank (FNB)');
      doc.font('Helvetica-Bold').text('Account Name: ', 280, y, { continued: true }).font('Helvetica').text('Freelance Geomatics ZA (Pty) Ltd');
      y += 12;
      doc.font('Helvetica-Bold').text('Account Number: ', 50, y, { continued: true }).font('Helvetica').text('62909760185');
      doc.font('Helvetica-Bold').text('Branch Code: ', 280, y, { continued: true }).font('Helvetica').text('250655');
      y += 12;
      doc.font('Helvetica-Bold').text('Payment Reference: ', 50, y, { continued: true }).font('Helvetica').text(`${accountNo} (${clientName})`);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
