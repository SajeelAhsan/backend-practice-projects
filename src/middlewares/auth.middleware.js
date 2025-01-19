import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import jsonwebtoken from "jsonwebtoken";
import { User } from "../models/user.model.js"


export const verifyJWT = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized request"
    });
  }

  try {
    const decodedTokenInfo = jsonwebtoken.verify(token, process.env.ACCESS_TOKEN_SECRET)
    const user = await User.findById(decodedTokenInfo?._id).select("-password -refreshToken")
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid Access Token"
      });
    }

    req.user = user;
    next()
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error?.message || "Invalid access token"
    });
  }
})