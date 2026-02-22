export interface OFXTransaction {
  fitId: string;
  date: string;
  amount: number;
  name: string;
  memo: string;
  type: string;
  checkNum: string;
}

function extractTag(block: string, tag: string): string {
  const re = new RegExp(`<${tag}>([^<\\r\\n]+)`);
  const match = block.match(re);
  return match ? match[1].trim() : "";
}

function parseOFXDate(raw: string): string {
  // OFX dates: YYYYMMDD or YYYYMMDDHHMMSS or YYYYMMDDHHMMSS.XXX[TZ]
  const digits = raw.replace(/[^0-9]/g, "");
  const y = digits.slice(0, 4);
  const m = digits.slice(4, 6);
  const d = digits.slice(6, 8);
  return `${y}-${m}-${d}`;
}

export function parseOFX(text: string): OFXTransaction[] {
  const transactions: OFXTransaction[] = [];

  // Extract all <STMTTRN>...</STMTTRN> blocks
  const blockRe = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let match;

  while ((match = blockRe.exec(text)) !== null) {
    const block = match[1];

    const fitId = extractTag(block, "FITID");
    const dtPosted = extractTag(block, "DTPOSTED");
    const trnAmt = extractTag(block, "TRNAMT");
    const name = extractTag(block, "NAME");
    const memo = extractTag(block, "MEMO");
    const trnType = extractTag(block, "TRNTYPE");
    const checkNum = extractTag(block, "CHECKNUM");

    if (!fitId || !dtPosted || !trnAmt) continue;

    const rawAmount = parseFloat(trnAmt);
    if (isNaN(rawAmount)) continue;

    transactions.push({
      fitId,
      date: parseOFXDate(dtPosted),
      // Negate: OFX negative=expense, positive=income
      // App convention: positive=expense, negative=income
      amount: -rawAmount,
      name: name || memo,
      memo,
      type: trnType,
      checkNum,
    });
  }

  return transactions;
}
