function escapePdfText(text) {
  return text.replaceAll(/([\\()])/g, "\\$1");
}

export function createTestPdf(
  text = "Backend Engineer Node MongoDB",
  { pageCount = 1 } = {},
) {
  const fontId = 3 + pageCount * 2;
  const pageIds = Array.from(
    { length: pageCount },
    (_, index) => 3 + index * 2,
  );
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageCount} >>`,
  ];

  pageIds.forEach((pageId, index) => {
    const contentId = pageId + 1;
    const pageText = typeof text === "function" ? text(index + 1) : text;
    const stream = `BT\n/F1 12 Tf\n72 720 Td\n(${escapePdfText(pageText)}) Tj\nET`;

    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`,
      `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    );
  });
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  pdf += offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf);
}
