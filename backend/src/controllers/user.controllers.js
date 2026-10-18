
import { User } from "../model/user.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import httpstatus from "http-status";

// Register
const Register = async (req, res) => {
    const { name, username, password } = req.body;

    try {
        // Check whether the username already exists
        const existingUser = await User.findOne({ username });

        if (existingUser) {
            return res.status(httpstatus.CONFLICT).json({
                message: "User already exists"
            });
        }

        // Hash the password before saving it
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name,
            username,
            password: hashedPassword
        });

        await newUser.save();

        return res.status(httpstatus.CREATED).json({
            message: "User created successfully"
        });
    } catch (error) {
        console.error("REGISTER ERROR:", error);

        return res.status(httpstatus.INTERNAL_SERVER_ERROR).json({
            message: "Something went wrong"
        });
    }
};

// Login
const Login = async (req, res) => {
    const { username, password } = req.body;

    try {
        // Find the user
        const existingUser = await User.findOne({ username });

        if (!existingUser) {
            return res.status(httpstatus.UNAUTHORIZED).json({
                message: "Invalid username or password"
            });
        }

        // Compare entered password with the stored hash
        const isPasswordCorrect = await bcrypt.compare(
            password,
            existingUser.password
        );

        if (!isPasswordCorrect) {
            return res.status(httpstatus.UNAUTHORIZED).json({
                message: "Invalid username or password"
            });
        }

        // Create a signed JWT that expires after one hour
        const token = jwt.sign(
            { userId: existingUser._id.toString() },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        return res.status(httpstatus.OK).json({
            message: "Login successful",
            token
        });
    } catch (error) {
        console.error("LOGIN ERROR:", error);

        return res.status(httpstatus.INTERNAL_SERVER_ERROR).json({
            message: "Something went wrong"
        });
    }
};

// Get the currently authenticated user
const GetUser = async (req, res) => {
    try {
        const authHeader = req.headers.authorization;

        // Expect: Authorization: Bearer <token>
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(httpstatus.UNAUTHORIZED).json({
                message: "Authentication token is required"
            });
        }

        const token = authHeader.split(" ")[1];

        // Verify the signature and expiry
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Find the user using the ID stored in the JWT
        const user = await User.findById(decoded.userId).select(
            "-password -token"
        );

        if (!user) {
            return res.status(httpstatus.UNAUTHORIZED).json({
                message: "User not found"
            });
        }

        return res.status(httpstatus.OK).json({
            name: user.name,
            username: user.username
        });
    } catch (error) {
        if (
            error.name === "JsonWebTokenError" ||
            error.name === "TokenExpiredError"
        ) {
            return res.status(httpstatus.UNAUTHORIZED).json({
                message: "Invalid or expired token"
            });
        }

        console.error("GET USER ERROR:", error);

        return res.status(httpstatus.INTERNAL_SERVER_ERROR).json({
            message: "Something went wrong"
        });
    }
};

export { Register, Login, GetUser };
