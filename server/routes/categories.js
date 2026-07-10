const router = require('express').Router();
const { getCategories, createCategory, updateCategory, deleteCategory } = require('../controllers/categoryController');
const auth = require('../middleware/auth');
const { categoryValidation } = require('../middleware/validate');

router.use(auth);

router.get('/', getCategories);
router.post('/', categoryValidation, createCategory);
router.put('/:id', categoryValidation, updateCategory);
router.delete('/:id', deleteCategory);

module.exports = router;
