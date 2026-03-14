/**
 * Generador de PDF para Reporte de Actividad Sospechosa (SAR/ROS).
 *
 * Genera un documento profesional con toda la evidencia del caso:
 * sujeto, alertas, decisiones, fuentes, cronologia y notas.
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ── Types ──

interface SarReportData {
  sar_report: {
    report_type: string;
    generated_at: string;
    case: {
      case_number: string;
      status: string;
      priority: string;
      title: string;
      description?: string;
      risk_level?: string;
      risk_score?: number;
      created_at: string;
      closed_at?: string;
      resolution?: string;
      sla_breached?: boolean;
      sar_filed?: boolean;
      sar_reference?: string;
    };
    subject: {
      entity_id?: string;
      entity_name?: string;
      entity_type?: string;
      client_name?: string;
      client_reference?: string;
    };
    alerts: Array<{
      alert_id: string;
      query_name: string;
      matched_entity: string;
      match_confidence: number;
      risk_score?: number;
      risk_level?: string;
      sources: string[];
      alert_type: string;
      decision?: string;
      decision_reason?: string;
      decided_at?: string;
    }>;
    decisions: Array<{
      decision_id: string;
      decision: string;
      reason: string;
      analyst_role?: string;
      evidence?: Record<string, unknown>;
      created_at: string;
      requires_approval?: boolean;
      approval_status?: string;
    }>;
    timeline: Array<{
      event: string;
      details?: Record<string, unknown>;
      old_value?: string;
      new_value?: string;
      timestamp: string;
    }>;
    notes: Array<{
      content: string;
      is_internal: boolean;
      created_at: string;
    }>;
    internal_notes: Array<{
      content: string;
      is_internal: boolean;
      created_at: string;
    }>;
    summary: {
      total_alerts: number;
      true_positives: number;
      false_positives: number;
      sources_involved: string[];
    };
  };
}

// ── Colors (RGB) ──

const COLORS = {
  primary: [30, 64, 175] as [number, number, number],       // blue-800
  danger: [185, 28, 28] as [number, number, number],         // red-700
  success: [21, 128, 61] as [number, number, number],        // green-700
  warning: [180, 83, 9] as [number, number, number],         // amber-700
  dark: [15, 15, 15] as [number, number, number],
  text: [55, 65, 81] as [number, number, number],            // gray-700
  textLight: [107, 114, 128] as [number, number, number],    // gray-500
  headerBg: [243, 244, 246] as [number, number, number],     // gray-100
  white: [255, 255, 255] as [number, number, number],
  line: [209, 213, 219] as [number, number, number],         // gray-300
  lightBg: [249, 250, 251] as [number, number, number],      // gray-50
};

// ── Helpers ──

const STATUS_LABELS: Record<string, string> = {
  open: 'Abierto',
  in_review: 'En Revision',
  escalated: 'Escalado',
  closed_tp: 'Confirmado (Verdadero Positivo)',
  closed_fp: 'Descartado (Falso Positivo)',
  closed_inconclusive: 'Inconcluso',
  sar_filed: 'SAR Presentado',
};

const DECISION_LABELS: Record<string, string> = {
  true_positive: 'Verdadero Positivo',
  false_positive: 'Falso Positivo',
  escalate: 'Escalado',
  inconclusive: 'Inconcluso',
};

const PRIORITY_LABELS: Record<string, string> = {
  critical: 'Critico',
  high: 'Alto',
  medium: 'Medio',
  low: 'Bajo',
};

const EVENT_LABELS: Record<string, string> = {
  created: 'Caso creado',
  status_changed: 'Estado actualizado',
  decision_made: 'Decision registrada',
  note_added: 'Nota agregada',
  alert_linked: 'Alerta vinculada',
  assigned: 'Caso asignado',
  escalated: 'Caso escalado',
};

function fmtDate(dateStr?: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('es-MX', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtDateShort(dateStr?: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('es-MX', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

// ── PDF Generator ──

export function generateSarPdf(data: SarReportData): void {
  const r = data.sar_report;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // ── Helper: check page break ──
  function checkPageBreak(needed: number) {
    if (y + needed > pageHeight - 25) {
      doc.addPage();
      y = margin;
      addFooter();
    }
  }

  // ── Helper: add footer to current page ──
  function addFooter() {
    const pageCount = doc.getNumberOfPages();
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.textLight);
    doc.text(
      `${r.case.case_number} — Reporte SAR/ROS — Pagina ${pageCount}`,
      pageWidth / 2, pageHeight - 10,
      { align: 'center' },
    );
    doc.text(
      'CONFIDENCIAL — Solo para uso regulatorio',
      pageWidth / 2, pageHeight - 6,
      { align: 'center' },
    );
  }

  // ── Helper: section title ──
  function sectionTitle(title: string) {
    checkPageBreak(15);
    y += 4;
    doc.setFillColor(...COLORS.primary);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.white);
    doc.setFont('helvetica', 'bold');
    doc.text(title.toUpperCase(), margin + 3, y + 5);
    y += 11;
    doc.setTextColor(...COLORS.text);
    doc.setFont('helvetica', 'normal');
  }

  // ── Helper: key-value row ──
  function kvRow(key: string, value: string, opts?: { bold?: boolean; color?: [number, number, number] }) {
    checkPageBreak(6);
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.textLight);
    doc.setFont('helvetica', 'normal');
    doc.text(key + ':', margin + 2, y);
    doc.setTextColor(...(opts?.color || COLORS.text));
    doc.setFont('helvetica', opts?.bold ? 'bold' : 'normal');
    doc.text(value, margin + 45, y);
    y += 5;
  }

  // ════════════════════════════════════════
  // PAGE 1: HEADER
  // ════════════════════════════════════════

  // Top banner
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 35, 'F');

  doc.setFontSize(18);
  doc.setTextColor(...COLORS.white);
  doc.setFont('helvetica', 'bold');
  doc.text('REPORTE DE ACTIVIDAD SOSPECHOSA', margin, 15);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('SAR / ROS — Expediente de Soporte para Cumplimiento', margin, 22);

  doc.setFontSize(9);
  doc.text(`No. Caso: ${r.case.case_number}`, pageWidth - margin, 13, { align: 'right' });
  doc.text(`Generado: ${fmtDate(r.generated_at)}`, pageWidth - margin, 19, { align: 'right' });
  if (r.case.sar_reference) {
    doc.text(`Ref SAR: ${r.case.sar_reference}`, pageWidth - margin, 25, { align: 'right' });
  }

  y = 42;

  // Confidentiality notice
  doc.setFillColor(254, 243, 199); // amber-100
  doc.rect(margin, y, contentWidth, 10, 'F');
  doc.setDrawColor(...COLORS.warning);
  doc.rect(margin, y, contentWidth, 10, 'S');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.warning);
  doc.setFont('helvetica', 'bold');
  doc.text(
    'CONFIDENCIAL — Este documento contiene informacion sensible de cumplimiento regulatorio.',
    pageWidth / 2, y + 4, { align: 'center' },
  );
  doc.setFont('helvetica', 'normal');
  doc.text(
    'Su distribucion esta restringida al area de cumplimiento y autoridades regulatorias.',
    pageWidth / 2, y + 8, { align: 'center' },
  );
  y += 15;

  // ════════════════════════════════════════
  // SECTION 1: SUJETO INVESTIGADO
  // ════════════════════════════════════════
  sectionTitle('1. Sujeto Investigado');

  kvRow('Nombre', r.subject.entity_name || '-', { bold: true });
  if (r.subject.entity_type) kvRow('Tipo', r.subject.entity_type);
  if (r.subject.client_name) kvRow('Cliente', r.subject.client_name);
  if (r.subject.client_reference) kvRow('Ref. Cliente', r.subject.client_reference);
  if (r.subject.entity_id) kvRow('ID Entidad', r.subject.entity_id);

  // ════════════════════════════════════════
  // SECTION 2: INFORMACION DEL CASO
  // ════════════════════════════════════════
  sectionTitle('2. Informacion del Caso');

  kvRow('Numero de Caso', r.case.case_number);
  kvRow('Estado', STATUS_LABELS[r.case.status] || r.case.status);
  kvRow('Prioridad', PRIORITY_LABELS[r.case.priority] || r.case.priority);
  kvRow('Nivel de Riesgo', `${r.case.risk_score ?? '-'}/100 (${r.case.risk_level || '-'})`,
    { color: (r.case.risk_score || 0) >= 70 ? COLORS.danger : COLORS.text });
  kvRow('Fecha de Creacion', fmtDate(r.case.created_at));
  if (r.case.closed_at) kvRow('Fecha de Cierre', fmtDate(r.case.closed_at));
  if (r.case.resolution) kvRow('Resolucion', r.case.resolution);
  kvRow('SLA', r.case.sla_breached ? 'VENCIDO' : 'Dentro de plazo',
    { color: r.case.sla_breached ? COLORS.danger : COLORS.success });
  if (r.case.sar_filed) {
    kvRow('SAR Presentado', 'Si');
    if (r.case.sar_reference) kvRow('Referencia SAR', r.case.sar_reference, { bold: true });
  }
  if (r.case.description) {
    checkPageBreak(10);
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.textLight);
    doc.text('Descripcion:', margin + 2, y);
    y += 4;
    doc.setTextColor(...COLORS.text);
    const descLines = doc.splitTextToSize(r.case.description, contentWidth - 5);
    doc.text(descLines, margin + 2, y);
    y += descLines.length * 4 + 2;
  }

  // ════════════════════════════════════════
  // SECTION 3: RESUMEN
  // ════════════════════════════════════════
  sectionTitle('3. Resumen de Hallazgos');

  // Summary boxes
  checkPageBreak(20);
  const boxWidth = contentWidth / 3 - 2;
  const boxes = [
    { label: 'Total Alertas', value: String(r.summary.total_alerts), color: COLORS.primary },
    { label: 'Verdaderos Positivos', value: String(r.summary.true_positives), color: COLORS.danger },
    { label: 'Fuentes Involucradas', value: String(r.summary.sources_involved.length), color: COLORS.warning },
  ];

  boxes.forEach((box, i) => {
    const bx = margin + i * (boxWidth + 3);
    doc.setFillColor(...COLORS.lightBg);
    doc.setDrawColor(...COLORS.line);
    doc.roundedRect(bx, y, boxWidth, 16, 2, 2, 'FD');
    doc.setFontSize(16);
    doc.setTextColor(...box.color);
    doc.setFont('helvetica', 'bold');
    doc.text(box.value, bx + boxWidth / 2, y + 7, { align: 'center' });
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.textLight);
    doc.setFont('helvetica', 'normal');
    doc.text(box.label, bx + boxWidth / 2, y + 13, { align: 'center' });
  });
  y += 22;

  // Sources list
  if (r.summary.sources_involved.length > 0) {
    checkPageBreak(10);
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.textLight);
    doc.text('Listas y fuentes donde aparece el sujeto:', margin + 2, y);
    y += 5;
    doc.setTextColor(...COLORS.text);
    const sourcesText = r.summary.sources_involved.map(s => s.replace(/_/g, ' ')).join(', ');
    const sourceLines = doc.splitTextToSize(sourcesText, contentWidth - 5);
    doc.setFont('helvetica', 'bold');
    doc.text(sourceLines, margin + 2, y);
    doc.setFont('helvetica', 'normal');
    y += sourceLines.length * 4 + 3;
  }

  // ════════════════════════════════════════
  // SECTION 4: DETALLE DE ALERTAS
  // ════════════════════════════════════════
  if (r.alerts.length > 0) {
    sectionTitle('4. Detalle de Alertas');

    const alertRows = r.alerts.map((a, i) => [
      String(i + 1),
      a.matched_entity || '-',
      `"${a.query_name}"`,
      `${Math.round((a.match_confidence || 0) * 100)}%`,
      String(a.risk_score ?? '-'),
      DECISION_LABELS[a.decision || ''] || a.decision || 'Pendiente',
    ]);

    autoTable(doc, {
      startY: y,
      head: [['#', 'Entidad', 'Busqueda', 'Confianza', 'Riesgo', 'Decision']],
      body: alertRows,
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 8,
        cellPadding: 2,
        textColor: COLORS.text,
        lineColor: COLORS.line,
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: COLORS.primary,
        textColor: COLORS.white,
        fontStyle: 'bold',
        fontSize: 8,
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        3: { cellWidth: 18, halign: 'center' },
        4: { cellWidth: 15, halign: 'center' },
        5: { cellWidth: 30 },
      },
      alternateRowStyles: { fillColor: COLORS.lightBg },
    });

    y = (doc as any).lastAutoTable.finalY + 5;

    // Decision reasons
    const alertsWithReasons = r.alerts.filter(a => a.decision_reason);
    if (alertsWithReasons.length > 0) {
      checkPageBreak(15);
      doc.setFontSize(9);
      doc.setTextColor(...COLORS.textLight);
      doc.setFont('helvetica', 'italic');
      doc.text('Justificaciones:', margin + 2, y);
      y += 5;
      doc.setFont('helvetica', 'normal');

      alertsWithReasons.forEach(a => {
        checkPageBreak(12);
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.text);
        doc.setFont('helvetica', 'bold');
        doc.text(`${a.matched_entity}:`, margin + 4, y);
        y += 4;
        doc.setFont('helvetica', 'normal');
        const reasonLines = doc.splitTextToSize(a.decision_reason || '', contentWidth - 10);
        doc.text(reasonLines, margin + 4, y);
        y += reasonLines.length * 3.5 + 3;
      });
    }
  }

  // ════════════════════════════════════════
  // SECTION 5: DECISIONES FORMALES
  // ════════════════════════════════════════
  if (r.decisions.length > 0) {
    sectionTitle('5. Decisiones Formales');

    const decRows = r.decisions.map((d, i) => [
      String(i + 1),
      DECISION_LABELS[d.decision] || d.decision,
      d.analyst_role || '-',
      d.approval_status || '-',
      fmtDateShort(d.created_at),
    ]);

    autoTable(doc, {
      startY: y,
      head: [['#', 'Decision', 'Rol', 'Aprobacion', 'Fecha']],
      body: decRows,
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 8,
        cellPadding: 2,
        textColor: COLORS.text,
        lineColor: COLORS.line,
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: COLORS.primary,
        textColor: COLORS.white,
        fontStyle: 'bold',
        fontSize: 8,
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
      },
      alternateRowStyles: { fillColor: COLORS.lightBg },
    });

    y = (doc as any).lastAutoTable.finalY + 5;

    // Decision reasons
    r.decisions.forEach(d => {
      if (d.reason) {
        checkPageBreak(12);
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.text);
        doc.setFont('helvetica', 'bold');
        doc.text(`${DECISION_LABELS[d.decision] || d.decision}:`, margin + 4, y);
        y += 4;
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(d.reason, contentWidth - 10);
        doc.text(lines, margin + 4, y);
        y += lines.length * 3.5 + 3;
      }
    });
  }

  // ════════════════════════════════════════
  // SECTION 6: CRONOLOGIA
  // ════════════════════════════════════════
  if (r.timeline.length > 0) {
    sectionTitle('6. Cronologia del Caso');

    const timeRows = r.timeline.map(t => {
      let detail = EVENT_LABELS[t.event] || t.event;
      if (t.old_value && t.new_value) {
        const oldLabel = STATUS_LABELS[t.old_value] || t.old_value;
        const newLabel = STATUS_LABELS[t.new_value] || t.new_value;
        detail += ` (${oldLabel} → ${newLabel})`;
      }
      if (t.details) {
        const d = t.details as Record<string, unknown>;
        if (d.reason) detail += ` — ${d.reason}`;
        if (d.decision) detail += ` — ${DECISION_LABELS[String(d.decision)] || d.decision}`;
      }
      return [fmtDate(t.timestamp), detail];
    });

    autoTable(doc, {
      startY: y,
      head: [['Fecha/Hora', 'Evento']],
      body: timeRows,
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 8,
        cellPadding: 2,
        textColor: COLORS.text,
        lineColor: COLORS.line,
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: COLORS.primary,
        textColor: COLORS.white,
        fontStyle: 'bold',
        fontSize: 8,
      },
      columnStyles: {
        0: { cellWidth: 35 },
      },
      alternateRowStyles: { fillColor: COLORS.lightBg },
    });

    y = (doc as any).lastAutoTable.finalY + 5;
  }

  // ════════════════════════════════════════
  // SECTION 7: NOTAS
  // ════════════════════════════════════════
  const allNotes = r.internal_notes || r.notes || [];
  if (allNotes.length > 0) {
    sectionTitle('7. Notas del Caso');

    allNotes.forEach((note, i) => {
      checkPageBreak(15);
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.textLight);
      doc.text(`${fmtDate(note.created_at)}${note.is_internal ? ' (interna)' : ''}`, margin + 2, y);
      y += 4;
      doc.setTextColor(...COLORS.text);
      const noteLines = doc.splitTextToSize(note.content, contentWidth - 5);
      doc.text(noteLines, margin + 2, y);
      y += noteLines.length * 3.5 + 2;

      if (i < allNotes.length - 1) {
        doc.setDrawColor(...COLORS.line);
        doc.line(margin + 2, y, margin + contentWidth - 2, y);
        y += 3;
      }
    });
  }

  // ════════════════════════════════════════
  // SIGNATURE BLOCK
  // ════════════════════════════════════════
  checkPageBreak(40);
  y += 10;

  doc.setDrawColor(...COLORS.line);
  doc.line(margin, y, margin + contentWidth, y);
  y += 8;

  doc.setFontSize(9);
  doc.setTextColor(...COLORS.text);
  doc.setFont('helvetica', 'normal');
  doc.text('Este documento fue generado automaticamente por el sistema de cumplimiento.', margin + 2, y);
  y += 5;
  doc.text('La informacion contenida debe ser verificada por el oficial de cumplimiento', margin + 2, y);
  y += 5;
  doc.text('antes de ser presentada ante la autoridad regulatoria.', margin + 2, y);
  y += 12;

  // Signature lines
  const sigWidth = (contentWidth - 20) / 2;
  doc.setDrawColor(...COLORS.text);
  doc.line(margin, y, margin + sigWidth, y);
  doc.line(margin + sigWidth + 20, y, margin + contentWidth, y);
  y += 5;

  doc.setFontSize(8);
  doc.setTextColor(...COLORS.textLight);
  doc.text('Oficial de Cumplimiento', margin + sigWidth / 2, y, { align: 'center' });
  doc.text('Fecha', margin + sigWidth + 20 + sigWidth / 2, y, { align: 'center' });

  // ── Add footers to all pages ──
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.textLight);
    doc.text(
      `${r.case.case_number} — Reporte SAR/ROS — Pagina ${i} de ${totalPages}`,
      pageWidth / 2, pageHeight - 10,
      { align: 'center' },
    );
    doc.text(
      'CONFIDENCIAL — Solo para uso regulatorio',
      pageWidth / 2, pageHeight - 6,
      { align: 'center' },
    );
  }

  // ── Save ──
  const filename = `SAR_${r.case.case_number}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
