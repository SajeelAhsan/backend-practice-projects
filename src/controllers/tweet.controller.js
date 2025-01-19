import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

//TODO: Create tweet
const createTweet = asyncHandler(async (req, res) => {
  // 1. get content from req.body
  const { content } = req.body;
  if (!content) {
    throw new Apierror(400, "you have'nt posted any tweet yet");
  }
  // 2. post tweet to db
  const postTweet = await Tweet.create({
    onwer: req.user?._id,
    content: content,
  });
  if (!postTweet) {
    return new ApiError(400, "Tweet not Posted!");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, postTweet, "Tweet Posted Successfully!"));
});



//TODO: Delete Tweet
const deleteTweet = asyncHandler(async (req, res) => {
  // 1. get tweetId from params URL
  const { tweetId } = req.params;
  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid Tweet");
  }
  // 2. check if the user is the owner of the tweet
  const findTweet = await Tweet.findOne({
    $and: [
      {
        owner: new mongoose.Types.ObjectId(req.user?._id),
      },
      {
        _id: tweetId,
      },
    ],
  });

  /*if (!findTweet) {
    throw new ApiError(400, "Tweet with given id does not found!");
  }*/
  // 3. if tweet belongs to user then delete the tweet
  const deleteTweet = await Tweet.findByIdAndDelete(tweetId);
  return res
    .status(200)
    .json(new ApiResponse(200, deleteTweet, "Tweet deleted successfully!"));
});

export { createTweet, deleteTweet };
