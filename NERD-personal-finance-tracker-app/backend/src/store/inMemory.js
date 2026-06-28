import { v4 as uuidv4 } from 'uuid';

class InMemoryStore {
  constructor() {
    this.users = [];
    this.transactions = [];
  }

  // User methods
  createUser(username, passwordHash) {
    const id = uuidv4();
    const user = {
      id,
      username,
      passwordHash,
      createdAt: new Date().toISOString()
    };
    this.users.push(user);
    return user;
  }

  getUserByUsername(username) {
    return this.users.find(user => user.username === username);
  }

  getUserById(id) {
    return this.users.find(user => user.id === id);
  }

  getAllUsers() {
    return this.users;
  }

  // Transaction methods
  createTransaction(userId, type, amount, category, description, date) {
    const id = uuidv4();
    const transaction = {
      id,
      userId,
      type,
      amount,
      category,
      description,
      date,
      createdAt: new Date().toISOString()
    };
    this.transactions.push(transaction);
    return transaction;
  }

  getTransactionById(id) {
    return this.transactions.find(t => t.id === id);
  }

  getTransactionsByUserId(userId, filters = {}) {
    let userTransactions = this.transactions.filter(t => t.userId === userId);

    if (filters.type) {
      userTransactions = userTransactions.filter(t => t.type === filters.type);
    }

    if (filters.category) {
      userTransactions = userTransactions.filter(t => t.category === filters.category);
    }

    return userTransactions;
  }

  getAllTransactions() {
    return this.transactions;
  }

  updateTransaction(id, updates) {
    const transaction = this.transactions.find(t => t.id === id);
    if (!transaction) {
      return null;
    }

    Object.assign(transaction, updates);
    return transaction;
  }

  deleteTransaction(id) {
    const index = this.transactions.findIndex(t => t.id === id);
    if (index === -1) {
      return false;
    }

    this.transactions.splice(index, 1);
    return true;
  }

  // Summary method
  getTransactionsSummary(userId) {
    const userTransactions = this.transactions.filter(t => t.userId === userId);

    let totalIncome = 0;
    let totalExpenses = 0;
    const byCategory = {};

    userTransactions.forEach(transaction => {
      if (transaction.type === 'income') {
        totalIncome += transaction.amount;
        byCategory[transaction.category] = (byCategory[transaction.category] || 0) + transaction.amount;
      } else if (transaction.type === 'expense') {
        totalExpenses += transaction.amount;
        byCategory[transaction.category] = (byCategory[transaction.category] || 0) + transaction.amount;
      }
    });

    return {
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
      byCategory
    };
  }

  // Reset store (for testing)
  reset() {
    this.users = [];
    this.transactions = [];
  }
}

// Export singleton instance
export default new InMemoryStore();
