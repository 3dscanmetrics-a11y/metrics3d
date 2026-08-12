import PDFDocument from 'pdfkit';

export function generateQuotePDF(lead: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];
      
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(24).font('Helvetica-Bold').fillColor('#00e5ff').text('3D Scan Metrics', { align: 'right' });
      doc.fontSize(10).fillColor('#6b7280').text('Industrial Scanning & BIM Solutions', { align: 'right' });
      doc.moveDown(2);

      // Title
      doc.fontSize(20).font('Helvetica-Bold').fillColor('#111827').text('Formal Scoping Estimate');
      doc.moveDown(1);

      // Client Info
      doc.fontSize(12).font('Helvetica-Bold').text('Prepared For:');
      doc.font('Helvetica').text(`${lead.name || 'Valued Client'}`);
      if (lead.company) doc.text(lead.company);
      doc.text(lead.email);
      doc.moveDown(1);

      // Project Specs
      doc.fontSize(14).font('Helvetica-Bold').text('Project Specifications', { underline: true });
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').text('Project Name: ', { continued: true }).font('Helvetica').text(lead.project || 'N/A');
      doc.font('Helvetica-Bold').text('Total Area: ', { continued: true }).font('Helvetica').text(`${lead.area} sqm`);
      doc.font('Helvetica-Bold').text('Complexity: ', { continued: true }).font('Helvetica').text(lead.complexity);
      
      let parsedDeliverables = [];
      try { parsedDeliverables = JSON.parse(lead.deliverables); } catch(e) {}
      doc.font('Helvetica-Bold').text('Requested Deliverables: ', { continued: true }).font('Helvetica').text(parsedDeliverables.join(', '));
      doc.moveDown(1);

      // Estimated Timeline
      doc.fontSize(14).font('Helvetica-Bold').text('Estimated Timeline', { underline: true });
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').text('Field Time (1 Scanner): ', { continued: true }).font('Helvetica').text(`${lead.fieldDays} Days`);
      doc.font('Helvetica-Bold').text('Processing Time: ', { continued: true }).font('Helvetica').text(`${lead.processDays} Days`);
      doc.moveDown(1.5);

      // Pricing Box
      const formatZAR = (val: number) => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(val || 0);
      
      doc.rect(50, doc.y, 500, 60).fill('#f3f4f6');
      doc.fillColor('#111827').fontSize(14).font('Helvetica-Bold').text('Formal quoted amount:', 70, doc.y + 20, { continued: true });
      doc.fillColor('#10b981').fontSize(18).text(`   ${formatZAR(lead.quoteTotal)}`);
      
      doc.moveDown(4);

      // Footer
      doc.fillColor('#6b7280').fontSize(10).font('Helvetica-Oblique').text('Note: This formal scoping estimate is based on the reviewed parameters above. Scope change may result in a revised quotation.', 50, doc.y, { align: 'center', width: 500 });

      // Add a new page for Terms & Conditions
      doc.addPage();
      
      // Terms & Conditions Header
      doc.fontSize(16).font('Helvetica-Bold').fillColor('#111827').text('General Terms and Conditions', { align: 'center' });
      doc.moveDown(1.5);
      
      // Terms Content
      doc.fontSize(10).font('Helvetica').fillColor('#4b5563');
      
      const terms = [
        "1. Scope of Work: The estimate provided above is based solely on the parameters extracted from the provided documentation. Any significant deviation in physical scope or complexity upon site arrival may result in a revised quotation.",
        "2. Validity: This estimate is valid for 30 days from the date of issue.",
        "3. Payment Terms: A 50% deposit is required prior to mobilization, with the remaining 50% due upon delivery of final processed data, unless otherwise negotiated.",
        "4. Site Access: The client is responsible for ensuring safe, unobstructed access to the scanning environment during the scheduled field days.",
        "5. Liability: 3D Scan Metrics is not liable for project delays caused by severe weather, site inaccessibility, or hazards undisclosed by the client.",
        "6. Data Ownership: Raw scan data and final deliverables remain the property of 3D Scan Metrics until full payment has been received.",
        "7. Accuracy Limitations: While industry-standard high-precision scanners are utilized, stated accuracy limits are subject to environmental conditions (e.g., vibration, dust) present on site."
      ];

      terms.forEach(term => {
        doc.text(term, { align: 'justify', lineGap: 4 });
        doc.moveDown(1);
      });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
