const express = require('express')
require('./config/dbconfig.js')
const userRouter = require('./router/userRouter.js');

const app = express();
app.use(express.json())

app.use('/uploads', express.static('uploads'))

app.use('/api/v1/user', userRouter)

app.listen(8000, () => {
    console.log(`server running on PORT: 8000`);
})