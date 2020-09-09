import { getCustomRepository, getRepository } from 'typeorm';
import AppError from '../errors/AppError';

import TransactionRepository from '../repositories/TransactionsRepository';

import Transaction from '../models/Transaction';
import Category from '../models/Category';
// import transactionsRouter from '../routes/transactions.routes';
// import ImportTransactionsService from './ImportTransactionsService';

interface Request {
  titleTransaction: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class CreateTransactionService {
  public async execute({
    titleTransaction,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    const transactionRepository = getCustomRepository(TransactionRepository);

    const categoryRepository = getRepository(Category);

    const { total } = await transactionRepository.getBalance();

    if (type === 'outcome' && value > total) {
      throw new AppError('Dont have enough balance');
    }

    let checkIfCategoryExists = await categoryRepository.findOne({
      where: { title: category },
    });

    if (!checkIfCategoryExists) {
      checkIfCategoryExists = categoryRepository.create({
        title: category,
      });
      await categoryRepository.save(checkIfCategoryExists);
    }

    const transaction = transactionRepository.create({
      title: titleTransaction,
      value,
      type,
      category: checkIfCategoryExists,
    });

    await transactionRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
