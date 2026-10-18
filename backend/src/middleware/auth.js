
import jwt from "jsonwebtoken";
import httpstatus from "http-status";

const auth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(httpstatus.UNAUTHORIZED).json({
                message: "Authentication token is required"
            });
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.userId = decoded.userId;

        next();
    } catch (error) {
        if (
            error.name === "JsonWebTokenError" ||
            error.name === "TokenExpiredError"
        ) {
            return res.status(httpstatus.UNAUTHORIZED).json({
                message: "Invalid or expired token"
            });
        }

        console.error("AUTH MIDDLEWARE ERROR:", error);

        return res.status(httpstatus.INTERNAL_SERVER_ERROR).json({
            message: "Something went wrong"
        });
    }
};

export default auth;
