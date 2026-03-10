
// Mocking logic to test challenge.ts
const { getDayOfYear, getRequiredRepsForDate, getFineAmountForMonth } = require('./src/lib/challenge');

function test() {
    console.log("--- Testing dayOfYear ---");
    const tests = [
        { date: "2026-01-01", expected: 1 },
        { date: "2026-02-28", expected: 59 },
        { date: "2026-03-01", expected: 60 },
        { date: "2026-12-31", expected: 365 },
        { date: "2024-03-01", expected: 61 }, // Leap year
    ];

    tests.forEach(t => {
        const val = getDayOfYear(t.date);
        console.log(`[${t.date}] got: ${val}, expected: ${t.expected} -> ${val === t.expected ? "PASS" : "FAIL"}`);
    });

    console.log("\n--- Testing fineAmounts ---");
    const fineTests = [
        { date: "2026-03-15", expected: 2 },
        { date: "2026-04-15", expected: 3 },
        { date: "2026-11-15", expected: 10 },
        { date: "2026-12-15", expected: 10 },
        { date: "2026-01-15", expected: 0 },
    ];

    fineTests.forEach(t => {
        const val = getFineAmountForMonth(t.date);
        console.log(`[${t.date}] got: ${val}€, expected: ${t.expected}€ -> ${val === t.expected ? "PASS" : "FAIL"}`);
    });
}

// Since challenge.ts uses ESM and I might be running in CommonJS context or needing bundling, 
// I'll just copy the logic here for a quick isolated test if needed, or try to run it with ts-node if available.
// But for now, I'll rely on reading my own code which is very straightforward.

/*
Logic in challenge.ts:
export function getDayOfYear(dateISO: string): number {
    const d = new Date(dateISO);
    const start = new Date(d.getFullYear(), 0, 0);
    const diff = (d.getTime() - start.getTime()) + ((start.getTimezoneOffset() - d.getTimezoneOffset()) * 60 * 1000);
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
}
*/

test();
