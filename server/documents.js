import PDFDocument from 'pdfkit';
import { ZipArchive } from 'archiver';
import { PassThrough } from 'node:stream';

export const formatMoney = (cents) => `${(cents / 100).toFixed(2).replace('.', ',')} EUR`;
export const formatDate = (value) => value ? new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Rome' }).format(new Date(value)) : '—';

export function createDigitalDocument({ title, reference, status, summary = [], sections = [], areaLabel = 'AREA 1' }) {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({ size: 'A4', margin: 48, bufferPages: true, info: { Title: title, Author: 'Sibillini Impact — ambiente demo' } });
    const chunks = [];
    document.on('data', (chunk) => chunks.push(chunk));
    document.on('end', () => resolve(Buffer.concat(chunks)));
    document.on('error', reject);

    document.rect(0, 0, 595.28, 86).fill('#111111');
    document.fill('#D7FF3F').font('Helvetica-Bold').fontSize(10).text(`SIBILLINI IMPACT / ${areaLabel}`, 48, 28);
    document.fill('#FFFFFF').font('Helvetica').fontSize(8).text('AMBIENTE DIMOSTRATIVO — DATI SINTETICI', 48, 49);
    document.fill('#111111').font('Helvetica-Bold').fontSize(23).text(title, 48, 112, { width: 495 });
    document.font('Helvetica').fontSize(9).fill('#62645F').text(`Riferimento: ${reference} · Stato: ${status}`, 48, 158, { width: 495 });
    document.moveTo(48, 181).lineTo(547, 181).lineWidth(1).strokeColor('#111111').stroke();

    let y = 202;
    for (const item of summary) {
      document.font('Helvetica-Bold').fontSize(8).fill('#62645F').text(item.label.toUpperCase(), 48, y);
      document.font('Helvetica-Bold').fontSize(16).fill('#111111').text(String(item.value), 48, y + 13, { width: 495 });
      y += 48;
    }

    for (const section of sections) {
      if (y > 690) { document.addPage(); y = 56; }
      document.font('Helvetica-Bold').fontSize(12).fill('#1947E5').text(section.heading, 48, y, { width: 495 });
      y = document.y + 10;
      if (section.paragraph) {
        document.font('Helvetica').fontSize(9).fill('#111111').text(section.paragraph, 48, y, { width: 495, lineGap: 3 });
        y = document.y + 12;
      }
      for (const [label, value] of section.rows ?? []) {
        if (y > 735) { document.addPage(); y = 56; }
        document.font('Helvetica-Bold').fontSize(8).fill('#62645F').text(label, 48, y, { width: 175 });
        document.font('Helvetica').fontSize(8).fill('#111111').text(String(value), 228, y, { width: 319 });
        y = Math.max(document.y, y + 12) + 7;
      }
      for (const bullet of section.bullets ?? []) {
        if (y > 735) { document.addPage(); y = 56; }
        document.font('Helvetica').fontSize(8).fill('#111111').text(`• ${bullet}`, 56, y, { width: 480, lineGap: 2 });
        y = document.y + 6;
      }
      y += 15;
    }

    const range = document.bufferedPageRange();
    for (let index = range.start; index < range.start + range.count; index += 1) {
      document.switchToPage(index);
      document.font('Helvetica').fontSize(7).fill('#62645F').text(
        `Documento digitale dimostrativo. Non valido per reporting, revisione o finalita legali. Pagina ${index + 1}/${range.count}`,
        48,
        790,
        { width: 495, align: 'center' },
      );
    }
    document.end();
  });
}

export function createZip(entries) {
  return new Promise((resolve, reject) => {
    const output = new PassThrough();
    const chunks = [];
    output.on('data', (chunk) => chunks.push(chunk));
    output.on('end', () => resolve(Buffer.concat(chunks)));
    output.on('error', reject);
    const archive = new ZipArchive({ zlib: { level: 9 } });
    archive.on('error', reject);
    archive.pipe(output);
    for (const entry of entries) archive.append(entry.content, { name: entry.name });
    archive.finalize();
  });
}
