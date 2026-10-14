import PDFDocument from "pdfkit";

/**
 * Landscape A4 certificate rendered with PDFKit.
 * Returns the finished PDF as a Buffer so it can be stored and attached to
 * the notification e-mail in one step.
 */

export interface CertificateData {
  studentName: string;
  courseTitle: string;
  completionDate: string; // formatted, e.g. "14 October 2026"
  certificateNumber: string;
  academyName: string;
  signer: string;
  footerNote: string;
  verificationUrl: string;
}

const BRAND_BLUE = "#1675D1";
const NAVY = "#12243A";
const INK = "#192B43";
const MUTED = "#65758B";
const LINE = "#E2EAF3";

export function renderCertificatePdf(data: CertificateData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      // A4 landscape
      const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 0 });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const pageWidth = doc.page.width; // 841.89
      const pageHeight = doc.page.height; // 595.28
      const centerX = pageWidth / 2;

      // ------------------------------------------------------------ frame
      doc.rect(0, 0, pageWidth, pageHeight).fill("#FFFFFF");
      doc.lineWidth(10).strokeColor(BRAND_BLUE).rect(24, 24, pageWidth - 48, pageHeight - 48).stroke();
      doc.lineWidth(1).strokeColor(LINE).rect(34, 34, pageWidth - 68, pageHeight - 68).stroke();

      // Corner accents
      doc.save();
      doc.rect(24, 24, 120, 6).fill(BRAND_BLUE);
      doc.rect(pageWidth - 144, pageHeight - 30, 120, 6).fill(BRAND_BLUE);
      doc.restore();

      // ------------------------------------------------------------ header
      doc.font("Helvetica-Bold").fontSize(13).fillColor(BRAND_BLUE);
      doc.text(data.academyName.toUpperCase(), 60, 62, { align: "center", width: pageWidth - 120, characterSpacing: 2.4 });

      doc.fontSize(30).fillColor(NAVY);
      doc.text("CERTIFICATE OF COMPLETION", 60, 92, { align: "center", width: pageWidth - 120 });

      // divider
      doc.moveTo(centerX - 120, 142).lineTo(centerX + 120, 142).lineWidth(2).strokeColor(BRAND_BLUE).stroke();

      doc.font("Helvetica").fontSize(12).fillColor(MUTED);
      doc.text("This certificate is presented to", 60, 162, { align: "center", width: pageWidth - 120 });

      // ------------------------------------------------------------ name
      doc.font("Helvetica-Bold").fontSize(36).fillColor(INK);
      doc.text(data.studentName, 60, 186, { align: "center", width: pageWidth - 120 });

      doc.moveTo(centerX - 160, 244).lineTo(centerX + 160, 244).lineWidth(1).strokeColor(LINE).stroke();

      // -------------------------------------------------------- statement
      doc.font("Helvetica").fontSize(12.5).fillColor(INK);
      doc.text(
        "For successfully completing the " +
          data.courseTitle +
          " course covering Salesforce Administration, CRM Functionality, Apex Programming, " +
          "Apex Development, and Visualforce.",
        130,
        262,
        { align: "center", width: pageWidth - 260, lineGap: 4 },
      );

      // --------------------------------------------------------- meta row
      const metaY = 340;
      const colWidth = (pageWidth - 200) / 3;

      const meta = [
        { label: "COMPLETION DATE", value: data.completionDate },
        { label: "CERTIFICATE NUMBER", value: data.certificateNumber },
        { label: "ISSUED BY", value: data.academyName },
      ];

      meta.forEach((item, index) => {
        const x = 100 + index * colWidth;
        doc.font("Helvetica-Bold").fontSize(8.5).fillColor(MUTED);
        doc.text(item.label, x, metaY, { align: "center", width: colWidth, characterSpacing: 1.2 });
        doc.font("Helvetica").fontSize(11.5).fillColor(INK);
        doc.text(item.value, x, metaY + 16, { align: "center", width: colWidth });
      });

      // ------------------------------------------------------------ signer
      doc.moveTo(centerX - 110, 430).lineTo(centerX + 110, 430).lineWidth(1).strokeColor(INK).stroke();
      doc.font("Helvetica").fontSize(11).fillColor(INK);
      doc.text(data.signer, centerX - 200, 438, { align: "center", width: 400 });
      doc.font("Helvetica").fontSize(9).fillColor(MUTED);
      doc.text("Academy Representative", centerX - 200, 454, { align: "center", width: 400 });

      // -------------------------------------------------------- verification
      doc.font("Helvetica").fontSize(8.5).fillColor(MUTED);
      doc.text(`Verify this certificate at ${data.verificationUrl}`, 60, pageHeight - 92, {
        align: "center",
        width: pageWidth - 120,
      });
      doc.font("Helvetica-Oblique").fontSize(8.5);
      doc.text(data.footerNote, 60, pageHeight - 76, { align: "center", width: pageWidth - 120 });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
