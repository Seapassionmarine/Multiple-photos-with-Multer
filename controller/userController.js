const UserModel = require('../model/userModel.js');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sendMail = require('../Helpers/Email');
const { signUpTemplate, verifyTemplate, forgotPasswordTemplate} = require('../Helpers/HTML');
require('dotenv')

const fs = require('fs');

exports.signUp = async (req,res) =>{
            try {
                // check if user exists
                const {Name,Stack,Email,Password} = req.body;
        
                const emailExist = await UserModel.findOne({ Email });
                if (emailExist) {
                    return res.status(400).json(`User with email already exist`);
                } else {
                    //perform an encryption using salt
                    const saltedPassword = await bcryptjs.genSalt(10);
                    //perform an encrytion of the salted password
                    const hashedPassword = await bcryptjs.hash(Password, saltedPassword);
                    // create object of the body
                    const images = req.files.map((file) => file.filename)
                    const user = new UserModel({
                        Name,
                        Stack,
                        Email,
                        Password: hashedPassword,
                        photos: images,
                    });
        
                    user.cohort = "cohort 4";
                    const userToken = jwt.sign(
                        { id: user._id, email: user.Email },
                        process.env.jwt_secret,
                        { expiresIn: "3 Minutes" }
                    );
                    const verifyLink = `${req.protocol}://${req.get(
                        "host"
                    )}/api/v1/user/verify/${userToken}`;
        
                    await user.save();
                    await sendMail({
                        subject: `Kindly Verify your mail`,
                        email: user.Email,
                        html: signUpTemplate(verifyLink,user.Name),
                    });
                    res.status(201).json({
                        message: `Welcome ${user.Name} kindly check your gmail to access the link to verify your email`,
                        data: user,
                    });
                }
            } catch (err) {
                res.status(500).json(err.message);
            }
        }
        
exports.logIn = async (req, res) => {
    try {
        const {Email,Password} = req.body;
        const checkMail = await UserModel.findOne({Email});
        if (!checkMail) {
            return res.status(404).json({
                message: 'User with email not found'
            })
        }

        const confirmPassword = await bcryptjs.compare(Password,checkMail.Password);
        if (!confirmPassword) {
            return res.status(404).json({
                message: 'Incorrect Password'
            })
        }

        if (!checkMail.isVerified) {
            return res.status(400).json({
                message: 'User not verified, Please check you email to verify your account.'
            })
        }

        const Token = await jwt.sign({
            userId: checkMail._id,
            Email: checkMail.Email
        }, process.env.JWT_SECRET, { expiresIn: '1h' })

        res.status(200).json({
            message: 'Login successfully',
            data: checkMail, 
            Token
        })
    } catch (err) {
        res.status(500).json(err.message)
    }
}

exports.verifyEmail = async (req, res) => {
    try {
        // Extract the token from the request params
        const {Token} = req.params;
        // Extract the email from the verified token
        const {Email} = jwt.verify(Token,process.env.JWT_SECRET);
        // Find the user with the email
        const user = await UserModel.findOne({Email});
        // Check if the user is still in the database
        if (!user) {
            return res.status(404).json({
                message: 'User not found'
            })
        }
        // Check if the user has already been verified
        if (user.isVerified) {
            return res.status(400).json({
                message: 'User already verified'
            })
        }
        // Verify the user
        user.isVerified = true;
        // Save the user data
        await user.save();
        // Send a success response
        res.status(200).json({
            message: 'User verified successfully'
        })

    } catch (err) {
        if (err instanceof jwt.JsonWebTokenError) {
            return res.json({message: 'Link expired.'})
        }
        res.status(500).json(err.message)
    }
}

exports.resendVerificationEmail = async (req, res) => {
    try {
        const {Email} = req.body;
        // Find the user with the email
        const user = await UserModel.findOne({Email});
        // Check if the user is still in the database
        if (!user) {
            return res.status(404).json({
                message: 'User not found'
            })
        }
        // Check if the user has already been verified
        if (user.isVerified) {
            return res.status(400).json({
                message: 'User already verified'
            })
        }

        const Token = jwt.sign({Email: user.Email }, process.env.JWT_SECRET, { expiresIn: '20mins' });
        const verifyLink = `${req.protocol}://${req.get('host')}/api/v1/user/verify/${Token}`
        let mailOptions = {
            Email: user.Email,
            subject: 'Verification email',
            HTML: verifyTemplate(verifyLink, user.FullName),
        }
        // Send the the email
        await sendMail(mailOptions);
        // Send a success message
        res.status(200).json({
            message: 'Verification email resent successfully'
        })

    } catch (err) {
        res.status(500).json(err.message)
    }
}

exports.ForgetPassword = async(req,res) =>{
    try {
        const {Email} = req.body
        // Find the user with the email
        const user = await UserModel.findOne({Email});
        // Check if the user is still in the database
        if (!user) {
            return res.status(404).json({
                message: 'User not found'
            })
        }

        const ResetToken = jwt.sign({Email: user.Email }, process.env.JWT_SECRET, { expiresIn: '20mins' });

        const verifyLink = `${req.protocol}://${req.get('host')}/api/v1/user/reset password/${ResetToken}`
        const mailOptions = {
            Email: user.Email,
            subject: 'Reset password',
            HTML:forgotPasswordTemplate(verifyLink,user.FullName)
        }

        await sendMail(mailOptions)

        res.status(200).json({
            message:`Email for reset password sent successfully`
        })
    } catch (err) {
        res.status(500).json(err.message)
    }
}

exports.ResetPassword = async (req,res)=>{
    try {
        //get the token from params
        const {Token} = req.params
        const {Password} = req.body

        //confirm the new password
        const {Email} = jwt.verify(Token,process.env.JWT_SECRET)
        // Find the user with the email
        const user = await UserModel.findOne({Email});
        // Check if the user is still in the database
        if (!user) {
            return res.status(404).json({
                message: 'User not found'
            })
        }

        const saltedeRounds = await bcryptjs.genSalt(10);
        const hashedPassword = await bcryptjs.hash(Password, saltedeRounds);

        user.Password = hashedPassword
        console.log(hashedPassword)

        await user.save()

        res.status(200).json({
            message:`Reset password successfully`
        })
    } catch (err) {
        if(err instanceof jwt.JsonWebTokenError){
            return res.status(400).json('Link has expired,Please request for a new link')
        }
        res.status(500).json(err.message)
    }
}

exports.changePassword = async(req,res)=>{
    try {
       const Token = req.params
       const {Password,OldPassword} = req.body
       const {Email} = jwt.verify(Token.process.env.JWT_SECRET) 
       //check for user
       const user = await UserModel.findOne({Email})
       if(!user){
        return res.status(400).json('User not found')
       }
       const verifyPassword = await bcryptjs.compare(OldPassword,user.Password)
       if(!verifyPassword){
        return res.status(400).json('Password does not correspond with  the previous password')
       }
       const saltedeRounds = await bcryptjs.genSalt(10)
       const hashedPassword = await bcryptjs.hash(Password,saltedeRounds)
       user.Password = hashedPassword

       await user.save()
       res.status(200).json('Password changed successfully')

    } catch (err) {
       res.status(500).json(err.message) 
    }
}

exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params
        const { name, stack, Email, Password} = req.body;
        const user = await UserModel.findById(id);
        if (!user) {
            return res.status(404).json({
                message: 'User not found'
            })
        }
        const data = {
            Name: name || user.Name,
            stack: stack || user.Stack,
            Email: Email || user.Email,
            Password: Password || user.Password,
            photos: user.photos
        }
        // Check if the user is passing a image
        if (req.file && req.file.filename) {
            // Dynamically get the old image path
            const oldFilePath = `uploads/${user.photos}`
            // Check if the file exists inside of the path
            if (fs.existsSync(oldFilePath)) {
                // Delete the existing image
                fs.unlinkSync(oldFilePath)
                // Update the data object
                data.photos = req.file.filename
            }
        }
        // Update the changes to our database
        const updatedUser = await UserModel.findByIdAndUpdate(id, data, { new: true });
        // Send a succes response to the user
        res.status(200).json({
            message: 'User details updated successfully',
            data: updatedUser
        })

    } catch (error) {
        res.status(500).json({
            message: error.message
        })
    }
}

exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params
        const user = await UserModel.findById(id);
        if (!user) {
            return res.status(404).json({
                message: 'User not found'
            })
        }
         // Dynamically get the old image path
         const oldFilePath = `uploads/${user.image}`
         // Check if the file exists inside of the path
         if (fs.existsSync(oldFilePath)) {
             // Delete the existing image
             fs.unlinkSync(oldFilePath)
         }
        const deletedUser = await UserModel.findByIdAndDelete(id);

        // Send a succes response to the user
        res.status(200).json({
            message: 'User details deleted successfully'
        })
    } catch (error) {
        res.status(500).json({
            message: error.message
        })
    }
}

exports.getOne = async (req, res) => {
    try {
        const { id } = req.params
        const oneUser = await UserModel.findById(id);
        if (!oneUser) {
            return res.status(404).json({
                message: 'User not found'
            })
        }
        res.status(200).json({
            message: 'User details',
            data: oneUser
        })
    } catch (error) {
        res.status(500).json({
            message: error.message
        })
    }
}

exports.getAll = async (req, res) => {
    try {
        const users = await UserModel.find();
        if (users.length === 0) {
            return res.status(404).json({
                message: 'No user found in this database'
            })
        }
        res.status(200).json({
            message: 'Users details',
            data: users
        })
    } catch (error) {
        res.status(500).json({
            message: error.message
        })
    }
}
