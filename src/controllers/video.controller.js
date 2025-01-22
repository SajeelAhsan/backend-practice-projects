import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudnary.js";
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

// Get a video by id
const getVideoById = asyncHandler(async (req, res) => {
  //TODO: get video by id
  try {
    // 1. Get the video id from the request params(frontend)  [http://localhost:8000/api/v1/video/get-video/:videoId]
    const { videoId } = req.params;

    // 2. Check if the videoId id is valid
    if (!isValidObjectId(videoId)) {
      throw new Apierror(400, "Invalid VideoID");
    }

    // 3. Find the video in the database
    const video = await Video.findById(videoId);

    if (!video) {
      throw new Apierror(400, "Failed to get Video details.");
    }

    return res.status(200).json(new ApiResponse(200, video, "Video found "));
  } catch (error) {
    res.status(501).json(new Apierror(501, {}, "Video not found"));
  }
});

// Update a video 
const updateVideo = asyncHandler(async (req, res) => {
  try {
    const { videoId } = req.params;
    if (!isValidObjectId(videoId)) {
      throw new ApiError(400, "Invalid VideoID");
    }

    const { title, description } = req.body;
    
    // Check if at least one field is provided for update
    if (!title && !description && !req.files?.thumbnail && !req.files?.videoFile) {
      throw new ApiError(400, "Please provide at least one field to update");
    }

    // Validate fields if they are provided
    if (title && title.trim() === "") {
      throw new ApiError(400, "Title cannot be empty");
    }
    if (description && description.trim() === "") {
      throw new ApiError(400, "Description cannot be empty");
    }

    const video = await Video.findById(videoId);
    if (!video) {
      throw new ApiError(404, "Video not found");
    }

    // Check ownership
    if (!video.owner.equals(req.user._id)) {
      throw new ApiError(403, "Unauthorized - You can't update this video");
    }

    // Handle thumbnail update if provided
    let thumbnailUrl = video.thumbnail;
    if (req.files?.thumbnail?.[0]?.path) {
      const thumbnailLocalPath = req.files.thumbnail[0].path;
      const thumbnailOnCloudnary = await uploadOnCloudinary(thumbnailLocalPath);
      
      if (!thumbnailOnCloudnary) {
        throw new ApiError(400, "Error while uploading thumbnail");
      }

      // Delete old thumbnail only if new upload is successful
      await deleteFromCloudinary(video.thumbnail);
      thumbnailUrl = thumbnailOnCloudnary.url;
    }

    // Handle video file update if provided
    let videoFileUrl = video.videoFile;
    let duration = video.duration;
    if (req.files?.videoFile?.[0]?.path) {
      const videoLocalPath = req.files.videoFile[0].path;
      const videoOnCloudnary = await uploadOnCloudinary(videoLocalPath);
      
      if (!videoOnCloudnary) {
        throw new ApiError(400, "Error while uploading video");
      }

      // Delete old video only if new upload is successful
      await deleteFromCloudinary(video.videoFile);
      videoFileUrl = videoOnCloudnary.url;
      duration = videoOnCloudnary.duration;
    }

    // Update video with provided fields
    const updatedVideo = await Video.findByIdAndUpdate(
      videoId,
      {
        $set: {
          title: title || video.title,
          description: description || video.description,
          thumbnail: thumbnailUrl,
          videoFile: videoFileUrl,
          duration: duration
        }
      },
      { new: true }
    );

    return res
      .status(200)
      .json(new ApiResponse(200, updatedVideo, "Video details updated successfully"));
      
  } catch (error) {
    throw new ApiError(
      error.statusCode || 500, 
      error.message || "Error while updating video"
    );
  }
});

export { publishAVideo, getVideoById, updateVideo };
