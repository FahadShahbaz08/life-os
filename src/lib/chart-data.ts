import { Trade } from '@/types';
import { format, parseISO } from 'date-fns';

export function computeCumulativePnL(trades: Trade[]): { label: string; value: number }[] {
  const closed = trades
    .filter(t => t.status === 'closed' && t.profitLoss !== null && t.closedAt)
    .sort((a, b) => a.closedAt!.localeCompare(b.closedAt!));

  if (closed.length === 0) return [];

  let cumulative = 0;
  return closed.map(t => {
    cumulative += t.profitLoss!;
    let label = t.closedAt!.slice(0, 10);
    try {
      label = format(parseISO(t.closedAt!), 'MMM d');
    } catch { /* keep default */ }
    return { label, value: cumulative };
  });
}

export function computeTradingStats(trades: Trade[]) {
  const closed = trades.filter(t => t.status === 'closed' && t.profitLoss !== null);
  const open = trades.filter(t => t.status === 'open');
  const totalPnL = closed.reduce((s, t) => s + (t.profitLoss ?? 0), 0);
  const wins = closed.filter(t => (t.profitLoss ?? 0) > 0).length;
  const losses = closed.filter(t => (t.profitLoss ?? 0) < 0).length;
  const winRate = closed.length > 0 ? Math.round((wins / closed.length) * 100) : 0;
  const totalInvested = closed.reduce((s, t) => s + t.investedAmount, 0);

  return { totalPnL, wins, losses, winRate, openCount: open.length, closedCount: closed.length, totalInvested };
}

export function computeMonthlyExpenses(expenses: { date: string; amount: number }[]): { label: string; value: number }[] {
  const byMonth: Record<string, number> = {};
  expenses.forEach(e => {
    const key = e.date.slice(0, 7);
    byMonth[key] = (byMonth[key] ?? 0) + e.amount;
  });
  return Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([key, value]) => {
      const [y, m] = key.split('-');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return { label: `${months[Number(m) - 1]} ${y.slice(2)}`, value };
    });
}

export function computeExpensesByCategory(expenses: { category: string; amount: number }[]): { label: string; value: number }[] {
  const map: Record<string, number> = {};
  expenses.forEach(e => {
    map[e.category] = (map[e.category] ?? 0) + e.amount;
  });
  return Object.entries(map)
    .map(([label, value]) => ({ label: label.replace('_', ' '), value }))
    .sort((a, b) => b.value - a.value);
}

export function computeMonthlyCashflow(
  incomes: { date: string; amount: number }[],
  expenses: { date: string; amount: number }[],
): { label: string; income: number; expenses: number; net: number }[] {
  const byMonth: Record<string, { income: number; expenses: number }> = {};
  incomes.forEach(i => {
    const key = i.date.slice(0, 7);
    if (!byMonth[key]) byMonth[key] = { income: 0, expenses: 0 };
    byMonth[key].income += i.amount;
  });
  expenses.forEach(e => {
    const key = e.date.slice(0, 7);
    if (!byMonth[key]) byMonth[key] = { income: 0, expenses: 0 };
    byMonth[key].expenses += e.amount;
  });
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([key, v]) => {
      const [y, m] = key.split('-');
      return { label: `${months[Number(m) - 1]} ${y.slice(2)}`, income: v.income, expenses: v.expenses, net: v.income - v.expenses };
    });
}
