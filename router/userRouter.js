const express = require('express')
const { signUp, getOne, getAll, updateUser, deleteUser, logIn, verifyEmail, resendVerificationEmail, ForgetPassword, ResetPassword, changePassword } = require('../controller/userController')
const upload = require('../utils/multer.js')

const router = express.Router()

router.post('/sign-up', upload.array('photos',5),signUp)
router.get('/one/:id', getOne)
router.get('/all', getAll)
router.put('/update/:id', upload.single('photos',5), updateUser)
router.post('/sign-in', logIn);
router.get('/verify/:token', verifyEmail);
router.post('/resend-verification', resendVerificationEmail);
router.post('/forgot-password',ForgetPassword)
router.post('/reset-password/:token',ResetPassword)
router.put('/change-password/:token',changePassword)
router.delete('/delete/:id',  deleteUser)

module.exports = router;