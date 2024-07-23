const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    Name: {
        type: String,
        required: true
    },
    Stack: {
        type: String
    },
    Email: {
        type: String,
        required: true
    },
    Password:{type:String,
        require:true
    },
    photos:[{
        type: String
    }],
    isVerified:{
        type:String
    }
    
}, {timestamps: true})

const UserModel = mongoose.model('User', userSchema);

module.exports = UserModel