import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

//TODO: Create tweet
const createTweet = asyncHandler(async (req, res) => {
  const { content } = req.body;
  if (!content) {
    throw new ApiError(400, "You haven't posted any tweet yet");
  }

  const tweet = await Tweet.create({
    owner: req.user?._id,
    content,
  });

  if (!tweet) {
    throw new ApiError(500, "Failed to create tweet");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, tweet, "Tweet Posted Successfully!"));
});

const getUserTweets = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  console.log("Request params:", {
    userId,
    page,
    limit,
    requestingUser: req.user?._id,
  });

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user ID");
  }

  const tweetsAggregate = await Tweet.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              username: 1,
              fullName: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        owner: {
          $first: "$owner",
        },
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
  ]);

  console.log(
    "Raw aggregation result:",
    JSON.stringify(tweetsAggregate, null, 2)
  );

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  console.log("Pagination options:", options);

  const startIndex = (options.page - 1) * options.limit;
  const endIndex = options.page * options.limit;

  const results = {
    totalTweets: tweetsAggregate.length,
    tweets: tweetsAggregate.slice(startIndex, endIndex),
    currentPage: options.page,
    totalPages: Math.ceil(tweetsAggregate.length / options.limit),
  };

  console.log("Final results:", {
    totalTweets: results.totalTweets,
    tweetsInPage: results.tweets.length,
    currentPage: results.currentPage,
    totalPages: results.totalPages,
  });

  if (tweetsAggregate.length === 0) {
    console.log("No tweets found for user:", userId);
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "No tweets found for this user"));
  }

  // Log sample tweet structure
  if (results.tweets.length > 0) {
    console.log("Sample tweet structure:", {
      content: results.tweets[0].content,
      owner: results.tweets[0].owner,
      createdAt: results.tweets[0].createdAt,
    });
  }

  return res
    .status(200)
    .json(new ApiResponse(200, results, "User tweets fetched successfully"));
});

//TODO: Delete Tweet
const deleteTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  // console.log("Attempting to delete tweet with ID:", tweetId);
  //console.log("User ID attempting deletion:", req.user?._id);

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid Tweet ID");
  }

  // First find the tweet
  const tweet = await Tweet.findById(tweetId);
  //console.log("Found tweet:", tweet);

  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  // Check if the logged-in user is the owner
  const isOwner = tweet.owner.toString() === req.user?._id?.toString();
  //console.log("Tweet owner:", tweet.owner);
  //console.log("Is user the owner?", isOwner);

  if (!isOwner) {
    throw new ApiError(403, "You are not authorized to delete this tweet");
  }

  // Delete the tweet
  const deletedTweet = await tweet.deleteOne();
  // console.log("Delete result:", deletedTweet);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Tweet deleted successfully!"));
});

//TODO: Update Tweet
const updateTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const { content } = req.body;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet ID");
  }
  if (!content?.trim()) {
    throw new ApiError(400, "Please write something!");
  }

  // First find the tweet
  const tweet = await Tweet.findById(tweetId);

  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  // Check if the logged-in user is the owner
  if (tweet.owner.toString() !== req.user?._id?.toString()) {
    throw new ApiError(403, "You are not authorized to update this tweet");
  }

  // Update the tweet
  tweet.content = content.trim();
  const updatedTweet = await tweet.save();

  return res
    .status(200)
    .json(new ApiResponse(200, updatedTweet, "Tweet updated successfully"));
});

export { createTweet, deleteTweet, updateTweet, getUserTweets };
