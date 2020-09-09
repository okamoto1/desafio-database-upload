import { In, getRepository, getCustomRepository } from 'typeorm';

import csv from 'csv-parse';
import fs from 'fs';

import Transaction from '../models/Transaction';
import Category from '../models/Category';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface CSVTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute(csvFilePath: string): Promise<Transaction[]> {
    const transaction: CSVTransaction[] = [];
    const categories: string[] = [];

    const categoriesRepository = getRepository(Category);
    const transactionRepository = getCustomRepository(TransactionsRepository);

    const readCSVStream = fs.createReadStream(csvFilePath);

    const parseStream = csv({
      from_line: 2,
      ltrim: true,
      rtrim: true,
    });

    const parseCSV = readCSVStream.pipe(parseStream);

    parseCSV.on('data', async data => {
      const [title, type, value, category] = data.map((cell: string) =>
        cell.trim(),
      );

      if (!title || !value || !type || !category) {
        return;
      }

      categories.push(category);

      transaction.push({ title, value, type, category });
    });

    await new Promise(resolve => parseCSV.on('end', resolve));

    const existentCategories = await categoriesRepository.find({
      where: {
        title: In(categories),
      },
    });

    const existentCategoriesTitles = existentCategories.map(
      (category: Category) => category.title,
    );

    const addCategoryTitles = categories
      .filter(category => !existentCategoriesTitles.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    const newCategories = categoriesRepository.create(
      addCategoryTitles.map(title => ({
        title,
      })),
    );

    await categoriesRepository.save(newCategories);

    const finalCategories = [...newCategories, ...existentCategories];

    const createdTransactions = transactionRepository.create(
      transaction.map(transactions => ({
        title: transactions.title,
        type: transactions.type,
        value: transactions.value,
        category: finalCategories.find(
          category => category.title === transactions.category,
        ),
      })),
    );

    console.log(createdTransactions);

    await transactionRepository.save(createdTransactions);

    await fs.promises.unlink(csvFilePath);

    return createdTransactions;
  }
}

export default ImportTransactionsService;
