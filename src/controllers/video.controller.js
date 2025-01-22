import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { uploadOnCloudinary } from "../utils/cloudnary.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const publishAVideo = asyncHandler(async (req, res) => {
  try {
    const { title, description } = req.body;
    //console.log("Request body:", req.body); // Debug log for request body

    // Validate title and description exist
    if (!title || !description) {
      throw new ApiError(400, "Title and description are required fields");
    }

    // Validate they're not empty strings after trimming
    if (title.trim() === "" || description.trim() === "") {
      throw new ApiError(400, "Title and description cannot be empty");
    }

    // Debug logs for files
    //console.log("Files received:", req.files);
    
    // Fix: Correct field names to match the upload middleware
    const videoLocalPath = req.files?.videoFile?.[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

    //console.log("Video path:", videoLocalPath);
   // console.log("Thumbnail path:", thumbnailLocalPath);

    if (!videoLocalPath) {
      throw new ApiError(400, "Video file is required");
    }
    if (!thumbnailLocalPath) {
      throw new ApiError(400, "Thumbnail is required");
    }

    // Upload to cloudinary
    const videoOnCloudnary = await uploadOnCloudinary(videoLocalPath);
    const thumbnailOnCloudnary = await uploadOnCloudinary(thumbnailLocalPath);

    if (!videoOnCloudnary) {
      throw new ApiError(400, "Error while uploading video");
    }
    if (!thumbnailOnCloudnary) {
      throw new ApiError(400, "Error while uploading thumbnail");
    }

    const video = await Video.create({
      title: title.trim(),
      description: description.trim(),
      videoFile: videoOnCloudnary.url,
      thumbnail: thumbnailOnCloudnary.url,
      duration: videoOnCloudnary.duration,
      isPublished: true,
      owner: req.user?._id,
    });

    if (!video) {
      throw new ApiError(500, "Failed to create video entry");
    }

    return res
      .status(201)
      .json(new ApiResponse(201, video, "Video uploaded successfully"));

  } catch (error) {
    //console.error("Error in publishAVideo:", error); // Debug log for errors
    throw new ApiError(500, error?.message || "Error while uploading video");
  }
});

export { publishAVideo };
