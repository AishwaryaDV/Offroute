import { jsPDF } from "jspdf";
import type { Circuit, Point } from "@/types/api";

const MARGIN = 20;
const PAGE_W = 210;
const CONTENT_W = PAGE_W - MARGIN * 2;

const CATEGORY_LABELS: Record<string, string> = {
  food: "Food",
  drink: "Drink",
  stay: "Stay",
  viewpoint: "Viewpoint",
  activity: "Activity",
  nature: "Nature",
  culture: "Culture",
  hidden_gem: "Hidden Gem",
  other: "Other",
};

export function exportCircuitPdf(circuit: Circuit, points: Point[]) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN;

  function checkPage(needed: number) {
    if (y + needed > 280) {
      doc.addPage();
      y = MARGIN;
    }
  }

  // Title
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(circuit.title, MARGIN, y);
  y += 10;

  // Description
  if (circuit.description) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    const lines = doc.splitTextToSize(circuit.description, CONTENT_W);
    checkPage(lines.length * 5);
    doc.text(lines, MARGIN, y);
    y += lines.length * 5 + 4;
  }

  // Tags
  if (circuit.tags && circuit.tags.length > 0) {
    doc.setFontSize(9);
    doc.setTextColor(80);
    doc.text(circuit.tags.map((t) => `#${t}`).join("  "), MARGIN, y);
    y += 6;
  }

  // Dates
  if (circuit.start_date || circuit.end_date) {
    doc.setFontSize(9);
    doc.setTextColor(120);
    const dateStr = [circuit.start_date, circuit.end_date]
      .filter(Boolean)
      .join(" → ");
    doc.text(dateStr, MARGIN, y);
    y += 6;
  }

  // Stats line
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(
    `${points.length} point${points.length !== 1 ? "s" : ""} · ${circuit.star_count} star${circuit.star_count !== 1 ? "s" : ""} · ${circuit.clone_count} clone${circuit.clone_count !== 1 ? "s" : ""}`,
    MARGIN,
    y,
  );
  y += 10;

  // Divider
  doc.setDrawColor(220);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 8;

  // Points
  const sorted = [...points].sort((a, b) => a.order_index - b.order_index);

  sorted.forEach((point, i) => {
    checkPage(30);

    // Point number + title
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30);
    doc.text(`${i + 1}. ${point.title}`, MARGIN, y);
    y += 6;

    // Category + coords
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    const meta: string[] = [];
    if (point.category) meta.push(CATEGORY_LABELS[point.category] ?? point.category);
    meta.push(`${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`);
    if (point.visited_at) meta.push(new Date(point.visited_at).toLocaleDateString());
    if (point.rating) meta.push(`${"★".repeat(point.rating)}${"☆".repeat(5 - point.rating)}`);
    doc.text(meta.join("  ·  "), MARGIN, y);
    y += 5;

    // Notes
    if (point.notes) {
      doc.setFontSize(10);
      doc.setTextColor(60);
      const noteLines = doc.splitTextToSize(point.notes, CONTENT_W);
      checkPage(noteLines.length * 4.5);
      doc.text(noteLines, MARGIN, y);
      y += noteLines.length * 4.5 + 2;
    }

    y += 5;
  });

  // Footer
  checkPage(15);
  y += 5;
  doc.setDrawColor(220);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 6;
  doc.setFontSize(8);
  doc.setTextColor(160);
  doc.text(`Exported from Offroute · ${new Date().toLocaleDateString()}`, MARGIN, y);

  doc.save(`${circuit.title.replace(/[^a-zA-Z0-9 ]/g, "").trim()}.pdf`);
}
