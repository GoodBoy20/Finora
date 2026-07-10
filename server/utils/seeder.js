const Category = require('../models/Category');

const defaultCategories = [
  { name: 'Food', category_type: 'expense', icon: 'UtensilsCrossed', color: '#EF4444', isDefault: true },
  { name: 'Transport', category_type: 'expense', icon: 'Car', color: '#F59E0B', isDefault: true },
  { name: 'Housing', category_type: 'expense', icon: 'Home', color: '#8B5CF6', isDefault: true },
  { name: 'Entertainment', category_type: 'expense', icon: 'Gamepad2', color: '#EC4899', isDefault: true },
  { name: 'Health', category_type: 'expense', icon: 'Heart', color: '#14B8A6', isDefault: true },
  { name: 'Shopping', category_type: 'expense', icon: 'ShoppingBag', color: '#F97316', isDefault: true },
  { name: 'Salary', category_type: 'income', icon: 'Banknote', color: '#10B981', isDefault: true },
  { name: 'Investment', category_type: 'income', icon: 'TrendingUp', color: '#3B82F6', isDefault: true },
  { name: 'Others', category_type: 'expense', icon: 'Tag', color: '#6B7280', isDefault: true },
];

const seedDefaultCategories = async () => {
  try {
    const count = await Category.countDocuments({ isDefault: true });
    if (count === 0) {
      await Category.insertMany(defaultCategories);
      console.log('Default categories seeded successfully');
    }
  } catch (err) {
    console.error('Error seeding categories:', err);
  }
};

module.exports = { seedDefaultCategories };
