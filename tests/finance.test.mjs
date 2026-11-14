import assert from "node:assert/strict";
import test from "node:test";
import { calculateBudgetSummary } from "../services/financeCalculations.ts";
import {
  calculateEntryImpact,
  calculateMonthlyTotal,
  calculateYearlyTotal,
} from "../services/reports.ts";

const april10 = new Date(2026, 3, 10, 12);
const entry = (type, amount, date = "2026-04-10") => ({ type, amount, date });
const summary = (entries, today = april10, dailyBudget = 30) =>
  calculateBudgetSummary(
    dailyBudget,
    calculateMonthlyTotal(entries, today.getFullYear(), today.getMonth()),
    calculateYearlyTotal(entries, today.getFullYear()),
    today,
  );

test("expenses reduce allowance and refunds restore it", () => {
  assert.equal(calculateEntryImpact(entry("expense", 50)), 50);
  assert.equal(calculateEntryImpact(entry("refund", 50)), -50);
  const entries = [entry("expense", 120), entry("refund", 20)];
  assert.equal(calculateMonthlyTotal(entries, 2026, 3), 100);
  assert.equal(calculateYearlyTotal(entries, 2026), 100);
  assert.equal(summary(entries).remainingToday, 200);
});

for (const type of ["income", "cashback"]) {
  test(`${type} cannot change any budget figure across spending/status levels`, () => {
    assert.equal(calculateEntryImpact(entry(type, 10000)), 0);
    for (const expense of [0, 400, 549, 850, 900, 950, 12000]) {
      const original = [entry("expense", expense)];
      const withReceipt = [...original, entry(type, 10000)];
      assert.deepEqual(summary(withReceipt), summary(original));
      assert.equal(calculateMonthlyTotal(withReceipt, 2026, 3), expense);
      assert.equal(calculateYearlyTotal(withReceipt, 2026), expense);
    }
  });
}

test("excess refunds leave negative spending visible but both bars empty", () => {
  const entries = [entry("expense", 100), entry("refund", 150)];
  const result = summary(entries);
  assert.equal(calculateMonthlyTotal(entries, 2026, 3), -50);
  assert.equal(result.remainingToday, 350);
  assert.equal(result.progressPercent, 0);
  assert.equal(result.yearlyProgressPercent, 0);
  assert.equal(result.status.text, "On track");
  assert.equal(result.recoveryDays, 0);
});

test("monthly status uses the whole month even when today's allowance is negative", () => {
  const result = summary([entry("expense", 400)]);
  assert.equal(result.remainingToday, -100);
  assert.equal(result.recoveryDays, 4);
  assert.equal(result.status.text, "On track");
  assert.ok(Math.abs(result.progressPercent - 44.44444444444444) < 1e-10);
});

test("monthly status thresholds and over-budget bars stay consistent", () => {
  for (const [spending, expected] of [
    [540, "On track"],
    [549, "Be careful"],
    [810, "Be careful"],
    [810.01, "On The Border! Be careful!"],
    [900, "On The Border! Be careful!"],
    [900.01, "Over budget"],
  ]) {
    const result = summary([entry("expense", spending)]);
    assert.equal(result.status.text, expected, `spending ${spending}`);
    assert.ok(result.progressPercent >= 0 && result.progressPercent <= 100);
    if (spending > 900) assert.equal(result.progressPercent, 100);
  }
});

test("yearly status uses the whole year on both the first and last day", () => {
  const firstDay = calculateBudgetSummary(30, 1000, 1000, new Date(2026, 0, 1));
  const lastDay = calculateBudgetSummary(30, 0, 1000, new Date(2026, 11, 31));
  assert.equal(firstDay.yearlyStatus.text, "On track");
  assert.equal(firstDay.yearlyUsedPercent, lastDay.yearlyUsedPercent);
  assert.ok(Math.abs(firstDay.yearlyUsedPercent - 9.132420091324201) < 1e-10);
});

test("annual budget counts calendar-year days including leap-year century rules", () => {
  for (const [year, days] of [
    [2026, 365],
    [2024, 366],
    [2000, 366],
    [2100, 365],
  ]) {
    const budget = days * 10;
    const exact = calculateBudgetSummary(10, 0, budget, new Date(year, 0, 1));
    const over = calculateBudgetSummary(
      10,
      0,
      budget + 0.01,
      new Date(year, 0, 1),
    );
    assert.equal(exact.yearlyUsedPercent, 100);
    assert.equal(exact.yearlyProgressPercent, 100);
    assert.equal(exact.yearlyStatus.text, "On The Border! Be careful!");
    assert.equal(over.yearlyStatus.text, "Over budget");
    assert.equal(over.yearlyProgressPercent, 100);
  }
});

test("a new month starts fresh while the annual total retains earlier spending", () => {
  const entries = [entry("expense", 1000, "2026-04-10")];
  const april = summary(entries, new Date(2026, 3, 30, 12));
  const may = summary(entries, new Date(2026, 4, 1, 12));
  assert.equal(april.remainingToday, -100);
  assert.equal(april.status.text, "Over budget");
  assert.equal(may.remainingToday, 30);
  assert.equal(may.progressPercent, 0);
  assert.equal(may.status.text, "On track");
  assert.equal(may.yearlyUsedPercent, april.yearlyUsedPercent);

  const compensated = [...entries, entry("expense", 800, "2026-05-30")];
  assert.equal(calculateMonthlyTotal(compensated, 2026, 4), 800);
  assert.equal(calculateYearlyTotal(compensated, 2026), 1800);
  assert.equal(
    summary(compensated, new Date(2026, 4, 30, 12)).yearlyStatus.text,
    "On track",
  );
});

test("monthly and yearly totals respect calendar boundaries and refund dates", () => {
  const entries = [
    entry("expense", 100, "2025-12-31"),
    entry("expense", 200, "2026-01-01"),
    entry("refund", 50, "2026-04-01"),
    entry("expense", 70, "2027-01-01"),
  ];
  assert.equal(calculateMonthlyTotal(entries, 2026, 0), 200);
  assert.equal(calculateMonthlyTotal(entries, 2026, 3), -50);
  assert.equal(calculateYearlyTotal(entries, 2026), 150);
  assert.equal(calculateYearlyTotal(entries, 2027), 70);
});

test("cent arithmetic avoids fake negative balances and recovery days", () => {
  const entries = [entry("expense", 0.1), entry("expense", 0.2)];
  assert.equal(calculateMonthlyTotal(entries, 2026, 3), 0.3);
  assert.equal(calculateYearlyTotal(entries, 2026), 0.3);
  const result = summary(entries, new Date(2026, 3, 1, 12), 0.3);
  assert.equal(result.remainingToday, 0);
  assert.equal(result.recoveryDays, 0);
  const cancelled = [...entries, entry("refund", 0.3)];
  assert.equal(calculateMonthlyTotal(cancelled, 2026, 3), 0);
});

test("recovery counts whole days without dropping or adding a cent", () => {
  assert.equal(
    calculateBudgetSummary(0.3, 0.6, 0.6, new Date(2026, 3, 1)).recoveryDays,
    1,
  );
  assert.equal(
    calculateBudgetSummary(0.3, 0.61, 0.61, new Date(2026, 3, 1)).recoveryDays,
    2,
  );
});

test("no spending or zero budget never yields invalid bar percentages", () => {
  for (const dailyBudget of [0, 30]) {
    const result = calculateBudgetSummary(dailyBudget, 0, 0, april10);
    assert.equal(result.progressPercent, 0);
    assert.equal(result.yearlyProgressPercent, 0);
    assert.equal(result.recoveryDays, 0);
  }
});

test("the month-passed indicator is independent of all entries", () => {
  const result = summary([
    entry("expense", 100),
    entry("refund", 200),
    entry("income", 5000),
    entry("cashback", 10),
  ]);
  assert.equal(result.monthPassedPercent, summary([]).monthPassedPercent);
});
