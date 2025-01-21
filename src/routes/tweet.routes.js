import { Router } from "express"
import { createTweet, deleteTweet, updateTweet, getUserTweets } from "../controllers/tweet.controller.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"

const router = Router();
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

//secured routes
router.route("/").post(createTweet);
router.route("/user/:userId").get(getUserTweets);
router.route("/:tweetId").delete(deleteTweet).patch(updateTweet);

export default router