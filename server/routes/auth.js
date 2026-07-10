const router = require('express').Router();
const { register, login, getMe, updateProfile, changePassword } = require('../controllers/authController');
const auth = require('../middleware/auth');
const { registerValidation, loginValidation } = require('../middleware/validate');

router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.get('/me', auth, getMe);
router.put('/me', auth, updateProfile);
router.put('/password', auth, changePassword);

module.exports = router;

