import expensesRaw from './data/expenses.csv?raw';
import investmentsRaw from './data/investments.csv?raw';
import subscriptionsRaw from './data/subscriptions.csv?raw';
import { parseCsv, toNumber } from './csv';

export function loadDashboardData() {
  const expenses = parseCsv(expensesRaw).map((row) => ({
    ...row,
    amount_inr: toNumber(row.amount_inr),
  }));

  const investments = parseCsv(investmentsRaw).map((row) => ({
    ...row,
    amount_inr: toNumber(row.amount_inr),
  }));

  const subscriptions = parseCsv(subscriptionsRaw).map((row) => ({
    ...row,
    amount_inr: toNumber(row.amount_inr),
  }));

  return { expenses, investments, subscriptions };
}
