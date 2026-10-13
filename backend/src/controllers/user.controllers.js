
import { User } from "../model/user.model.js";

import bcrypt from "bcrypt"; // CHANGED: removed unused { hash }

import httpstatus from "http-status";


// Register

const Register = async (req, res) => {

    console.log("REGISTER REQUEST RECEIVED");
    console.log(req.body);

    const { name, username, password } = req.body;

    try {

        const existinguser = await User.findOne({ username });

        if (existinguser) {

            return res
                .status(httpstatus.FOUND)
                .json({ message: "User Already Existing" });
        }

        const hashpassword = await bcrypt.hash(password, 10);

        const NewUser = new User({
            name: name,
            username: username,
            password: hashpassword
        });

        await NewUser.save();

        console.log("USER CREATED SUCCESSFULLY"); // CHANGED: log before response

        res
            .status(httpstatus.CREATED)
            .json({ message: "User Created successfully" });

    }
    catch (e) {

        console.log("REGISTER ERROR:", e); // CHANGED: added error log

        res
            .status(httpstatus.INTERNAL_SERVER_ERROR) // CHANGED: NOT_FOUND → INTERNAL_SERVER_ERROR
            .json({ message: "Something Went Wrong" });
    }
};


// Login

const Login = async (req, res) => {

    const { username, password } = req.body;

    try {

        const existingUser = await User.findOne({ username });

        if (!existingUser) {

            return res
                .status(httpstatus.NOT_FOUND)
                .json({ message: "User Not Found" });
        }

        const isPasswordCorrect = await bcrypt.compare(
            password,
            existingUser.password
        );

        if (!isPasswordCorrect) {

            return res
                .status(httpstatus.UNAUTHORIZED)
                .json({ message: "Invalid Password" });
        }



            const token=Math.random().toString(36).substring(2)

            existingUser.token=token

            await existingUser.save()

            return res.status(httpstatus.OK).json({
                message:"Login success",
                token:token
            })


    }
    catch (e) {

        console.log("LOGIN ERROR:", e); // CHANGED: added error log

        res
            .status(httpstatus.INTERNAL_SERVER_ERROR)
            .json({ message: "Something Went Wrong" });
    }
};
const GetUser = async (req, res) => {

    const token = req.headers.authorization;

    const user = await User.findOne({ token });

    if (!user) {
        return res.status(httpstatus.UNAUTHORIZED).json({
            message: "Invalid Token"
        });
    }

    return res.status(httpstatus.OK).json({
        name: user.name,
        username: user.username
    });
};
export { Register, Login, GetUser };