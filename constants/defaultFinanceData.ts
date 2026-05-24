export const DEFAULT_BUDGET_AREAS = [
  {
    name: "Daily Life",
    kind: "personal",
    entryKinds: [
      {
        name: "Expense",
        mathType: "expense",
        categories: [
          "Clothes",
          "Eating Out",
          "Fun",
          "Gas",
          "Grocery",
          "Health",
          "Subscriptions",
          "Other",
        ],
      },
      {
        name: "Cashback",
        mathType: "income",
        categories: ["Cashback"],
      },
      {
        name: "Refund",
        mathType: "reduce_expense",
        categories: ["Refund"],
      },
      {
        name: "Return",
        mathType: "reduce_expense",
        categories: ["Return"],
      },
    ],
  },

  {
    name: "My Business",
    kind: "business",
    entryKinds: [
      {
        name: "Expense",
        mathType: "expense",
        categories: [
          "Advertising",
          "Assets",
          "Commissions",
          "Subscriptions",
          "Supplies",
          "Travel",
          "Other Expense",
        ],
      },
      {
        name: "Income",
        mathType: "income",
        categories: ["Recurring", "Tip", "Sales", "Other Income"],
      },
      {
        name: "Cashback",
        mathType: "income",
        categories: ["Cashback"],
      },
      {
        name: "Refund",
        mathType: "reduce_expense",
        categories: ["Refund"],
      },
      {
        name: "Return",
        mathType: "reduce_expense",
        categories: ["Return"],
      },
    ],
  },
];
