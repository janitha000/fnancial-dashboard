Build a Financial Visualization Dashboard for the 2025/2026 financial year with the following specifications. The app should be optimized for Vercel deployment using React (Next.js) and Tailwind CSS, utilizing shadcn/ui for components and Recharts for visualizations.

1. DATA INPUT & STRUCTURE
- Implement a CSV file upload feature on a 'Data Management' page.
- The dashboard must parse data based on the following categories found in my "Income Tax" spreadsheet (Sheet 25/26):
  * Income: Monthly Total FD, USD FD (LKR equivalent), Salary (Janitha & Vindya), Equity Funds, Dividends, and Stock Market returns.
  * Expenses: Monthly costs (target: 500,000 LKR/month) and Loan repayments.
  * Taxes: Monthly Tax Paid records for both individuals (Janitha & Vindya).
  * Assets/Wealth: NDB, Savings, LKR FD, USD FD, CAL UT, Treasury Bills, and Stock Market balances.

2. MAIN DASHBOARD (SUMMARY PAGE)
- Create a high-level summary view featuring:
  * Key Metric Cards: Total Annual Income, Total Tax Paid, Net Savings, and current Net Worth.
  * A "Monthly Income vs. Expense" bar chart.
  * A "Wealth Distribution" pie chart showing the breakdown of assets (FD, Stocks, Treasury Bills, etc.).
  * A "Tax Impact" indicator showing total tax as a percentage of total income.

3. NAVIGATION & TABS
Implement a sidebar or top navigation with the following menus:
- Income: Detailed breakdown of local vs. foreign income and monthly trends.
- Expenses: Tracker for monthly costs vs. the 500k target and loan interest.
- Taxes: Detailed view of tax paid by Janitha and Vindya, including taxable income brackets (6% and 15% tiers).
- Wealth Tracker: Monthly trend line chart of "Total Capital" growth.

4. TECHNICAL REQUIREMENTS
- Frontend: React with Tailwind CSS.
- Charts: Recharts or Chart.js for all visualizations.
- Hosting: Optimize for Vercel (use serverless functions if needed for CSV parsing).
- Theme: Clean, professional "FinTech" aesthetic with dark mode support.



Following are current tracked items in the sheet (it is done for each financial year , e.g. 2025/2026, 2026/2027 etc)

Income

1. Monthly Total FD
2. USD FD (LKR equivalent)
3. Salary (Janitha & Vindya)
4. Equity Funds
5. Dividends
6. Stock Market returns

Expenses

1. Monthly costs (target: 500,000 LKR/month)
2. Loan repayments

Taxes

1. Monthly Tax Paid records for both individuals (Janitha & Vindya).
2. Taxable income brackets (6% and 15% tiers).

Assets/Wealth

1. NDB
2. Savings
3. LKR FD
4. USD FD
5. CAL UT
6. Treasury Bills
7. Stock Market balances

