import express, { response } from "express";
import cors from "cors";
import mongoose from "mongoose";
import crypto from "crypto";
import bcrypt from "bcrypt";

const mongoUrl =
  process.env.MONGO_URL || "mongodb://localhost/authAPI";
mongoose.connect(mongoUrl, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
mongoose.Promise = Promise;

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  accessToken: {
    type: String,
    default: () => crypto.randomBytes(128).toString("hex"),
  },
});

const User = mongoose.model("User", UserSchema);

// Defines the port the app will run on. Defaults to 8080, but can be
// overridden when starting the server. For example:
//
//   PORT=9000 npm start
const port = process.env.PORT || 8080;
const app = express();

// Add middlewares to enable cors and json body parsing
app.use(cors());
app.use(express.json());

// check is accesstoken was sent with the request
const authenticateUser = async (req, res, next) => {
  const accessToken = req.header("Authorization");
  try {
    const user = await User.findOne({ accessToken });
    if (user) {
      next();
    } else {
      res
        .status(404)
        .json({ response: "Please log in", success: false });
    }
  } catch (error) {
    res.status(400).json({
      response: error,
      message: "Something went wrong...",
      success: false,
    });
  }
};

// Start defining your routes here
app.get("/", (req, res) => {
  res.send("Hello world");
});

app.post("/signup", async (req, res) => {
  const { username, password } = req.body;
  try {
    const salt = bcrypt.genSaltSync();

    const newUser = await new User({
      username,
      password: bcrypt.hashSync(password, salt),
    }).save();

    res.status(201).json({
      response: {
        userId: newUser._id,
        username: newUser.username,
        accessToken: newUser.accessToken,
      },
      success: true,
    });
  } catch (error) {
    //console.log(error.code)
    if (error.code === 11000) {
      res.status(400).json({
        response: error,
        message:
          "This username is already registered. please choose another one",
        success: false,
      });
    } else {
      res.status(400).json({
        response: error,
        message: "Something went wrong...",
        success: false,
      });
    }
  }
});

app.post("/signin", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });

    if (user && bcrypt.compareSync(password, user.password)) {
      res.status(200).json({
        userId: user._id,
        username: user.username,
        accessToken: user.accessToken,
      });
    } else if (user && !bcrypt.compareSync(password, user.password)) {
      res
        .status(403)
        .json({ message: "Incorrect password", success: false });
    } else {
      res
        .status(404)
        .json({ message: "User not found", success: false });
    }
  } catch (error) {
    res.status(400).json({
      response: error,
      message: "Something went wrong...",
      success: false,
    });
  }
});

// Start the server
app.listen(port, () => {
  // eslint-disable-next-line
  console.log(`Server running on http://localhost:${port}`);
});
