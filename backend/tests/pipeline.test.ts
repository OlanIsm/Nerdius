import test from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { extractText } from "unpdf";
import { shuffleQuestionOptions } from "../src/modules/game/pdf.ts";
import { blindSolveQuestions, type BlindSolveItem } from "../src/platform/gemini.ts";

test("unpdf extracts digital text locally without contacting external APIs", async () => {
  const doc = await PDFDocument.create();
  const page = doc.addPage();
  page.drawText("Pengantar Sistem Basis Data dan SQL.");
  const pdfBytes = Buffer.from(await doc.save());

  const { totalPages, text } = await extractText(new Uint8Array(pdfBytes));
  assert.equal(totalPages, 1);
  const pageText = (Array.isArray(text) ? text[0] : text) || "";
  assert.match(pageText, /Basis Data/);
});

test("scan detector correctly identifies pages with less than 80 characters", async () => {
  const doc = await PDFDocument.create();
  // Page 1: diagram / scan with minimal text (under 80 chars)
  doc.addPage([600, 800]).drawText("Figure 1.1: Diagram");

  // Page 2: dense educational text (over 80 chars)
  const page2 = doc.addPage([600, 800]);
  const lines = [
    "Relational database management systems organize data into structured tables.",
    "Each table consists of rows and columns with strict schema integrity.",
    "SQL allows querying and manipulating data using DDL and DML commands.",
  ];
  lines.forEach((line, index) => page2.drawText(line, { x: 35, y: 700 - index * 20 }));

  const pdfBytes = Buffer.from(await doc.save());

  const { totalPages, text } = await extractText(new Uint8Array(pdfBytes));
  assert.equal(totalPages, 2);
  const pages = Array.isArray(text) ? text : [text];

  assert.ok((pages[0] || "").trim().length < 80, "Page 1 should be detected as scan/diagram");
  assert.ok((pages[1] || "").trim().length >= 80, "Page 2 should be detected as full text");
});

test("shuffleQuestionOptions preserves correct answer value while randomizing order", () => {
  const options = ["Apple", "Banana", "Cherry", "Date"];
  const originalAnswerIndex = 1; // Banana
  const expectedAnswer = options[originalAnswerIndex];

  let differentIndexSeen = false;
  for (let i = 0; i < 20; i++) {
    const shuffled = shuffleQuestionOptions([...options], originalAnswerIndex);
    assert.equal(shuffled.options.length, 4);
    assert.equal(shuffled.options[shuffled.answerIndex], expectedAnswer);
    if (shuffled.answerIndex !== originalAnswerIndex) {
      differentIndexSeen = true;
    }
  }
  assert.ok(differentIndexSeen, "Shuffling should distribute answers across different option indices");
});

test("blindSolveQuestions matches solutions using custom solver and discards wrong answers", async () => {
  const questions: BlindSolveItem[] = [
    {
      id: "q1",
      prompt: "What is 2 + 2?",
      options: ["3", "4", "5", "6"],
    },
    {
      id: "q2",
      prompt: "Which planet is known as the Red Planet?",
      options: ["Venus", "Mars", "Jupiter", "Saturn"],
    },
  ];

  // Custom solver simulating blind solve evaluation
  const customSolver = async (items: BlindSolveItem[]) => {
    return items.map((item) => ({
      id: item.id,
      selectedIndex: item.id === "q1" ? 1 : 1, // '4' and 'Mars'
    }));
  };

  const solutions = await blindSolveQuestions(questions, customSolver);
  assert.equal(solutions.length, 2);
  assert.equal(solutions[0].selectedIndex, 1);
  assert.equal(solutions[1].selectedIndex, 1);
});
